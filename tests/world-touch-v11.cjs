'use strict';
/* Real browser touch input: regression coverage for pins, pan and two-finger zoom. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const results=[],errors=[];
  const page = await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push(error.message));
  await page.setContent('<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="app"><canvas id="world"></canvas><div id="floating-actions"></div><header class="topbar"><div class="brand">Sternenbaby</div></header><section id="message" class="message-bubble"><p id="message-text">Tippe auf einen Ort!</p></section><nav class="bottom-nav"><button class="nav-item">Zuhause</button><button class="nav-item">Baby</button><button class="nav-item">Spielen</button><button class="nav-item">Album</button><button class="nav-item">Pause</button></nav></main></body></html>');
  await page.addStyleTag({path:path.join(root,'www/style.css')});
  await page.addStyleTag({path:path.join(root,'www/polish.css')});
  await page.addScriptTag({path:path.join(root,'www/art.js')});
  await page.addScriptTag({path:path.join(root,'www/world.js')});
  await page.evaluate(()=>{
    window.state={positions:{rumi:{x:8,y:7},mira:{x:9,y:5},zoey:{x:5,y:8}},settings:{reduceMotion:true},selected:'rumi',mother:'rumi',story:3,babyStage:2,lastCare:'none',wall:0,outfit:0,decorations:['bunting','lanterns','rainbow','flowerArch']};
    window.interactions=[];window.requests=[];
    window.world=new GameWorld.World(document.getElementById('world'),state,{icon:Art.icon,onInteract:action=>interactions.push(action)});
    const go=world.goToObject;
    world.goToObject=function(id){requests.push(id);return go.call(this,id);};
    window.focusObject=id=>{
      world.resetCamera();const entry=world.labels.find(label=>label.o.id===id),o=entry.o;
      const p=world.project(o.x,o.y);p.x+=(o.labelDX||0)*world.camera.scale;p.y+=((o.labelBelow||-o.height)+(o.labelDY||0))*world.camera.scale;
      world.camera.x+=world.width*.54-p.x;world.camera.y+=world.height*.46-p.y;world.cameraChanged();
      requests.length=0;interactions.length=0;world.pending=null;
      for(const actor of Object.values(world.actors)){actor.path=[];actor.action=null;actor.moving=false;}
    };
    window.pinErrors=()=>world.labels.filter(entry=>!entry.button.hidden).map(({button,o})=>{
      const box=button.getBoundingClientRect(),p=world.project(o.x,o.y);
      p.x+=(o.labelDX||0)*world.camera.scale;p.y+=((o.labelBelow||-o.height)+(o.labelDY||0))*world.camera.scale;
      return{id:o.id,x:Math.abs(box.x+box.width/2-p.x),y:Math.abs(box.y+box.height-p.y)};
    });
  });
  const cdp = await page.context().newCDPSession(page);
  const point=(x,y,id=1)=>({x,y,id,radiusX:7,radiusY:7,force:1});
  const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  const centre=async locator=>{const r=await locator.boundingBox();assert(r,'Target pin must be visible');return{x:r.x+r.width/2,y:r.y+r.height/2};};
  const tap=async target=>{const p=await centre(target);await touch('touchStart',[point(p.x,p.y)]);await touch('touchEnd',[]);};
  const swipe=async(from,to)=>{
    await touch('touchStart',[point(from.x,from.y)]);
    for(let i=1;i<=8;i++){await touch('touchMove',[point(from.x+(to.x-from.x)*i/8,from.y+(to.y-from.y)*i/8)]);await page.waitForTimeout(18);}
    await touch('touchEnd',[]);
  };
  const pass=(name,data={})=>{results.push({name,...data});console.log('PASS',name,JSON.stringify(data));};
  try {
    // The old generic button:active scale replaced translate(...): the pin jumped off the finger.
    await page.evaluate(()=>focusObject('piano'));
    const pin=page.locator('[data-object-id="piano"]'),before=await pin.boundingBox(),p=await centre(pin);
    await touch('touchStart',[point(p.x,p.y)]);await page.waitForTimeout(30);
    const pressed=await pin.boundingBox();
    assert(Math.abs(before.x-pressed.x)<.1&&Math.abs(before.y-pressed.y)<.1,'A pressed pin jumps away from the finger');
    await touch('touchEnd',[]);
    assert.deepEqual(await page.evaluate(()=>requests),['piano'],'A real touch must dispatch exactly one pin action');
    pass('touch-pin-stays-under-finger-and-dispatches-once');

    // Every labelled destination follows the same trusted touch path, including SVG children.
    const ids=await page.evaluate(()=>world.labels.map(entry=>entry.o.id));
    for(const id of ids){
      await page.evaluate(id=>focusObject(id),id);
      const target=page.locator('[data-object-id="'+id+'"]');await tap(target);
      assert.deepEqual(await page.evaluate(()=>requests),[id]);
    }
    pass('all-destination-pins-accept-real-touch',{destinations:ids.length});

    // Uncovered furniture and floor still receive their original actions.
    await page.evaluate(()=>{
      focusObject('piano');for(const a of Object.values(world.actors)){a.x=16;a.y=14;}
    });
    const furniture=await page.evaluate(()=>{const o=GameWorld.objects.find(o=>o.id==='piano'),p=world.project(o.x,o.y);return{x:p.x,y:p.y-35*world.camera.scale};});
    assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y).id,furniture),'world','Furniture tap is intercepted by an unrelated overlay');
    await touch('touchStart',[point(furniture.x,furniture.y)]);await touch('touchEnd',[]);
    assert.deepEqual(await page.evaluate(()=>requests),['piano']);
    const floor=await page.evaluate(()=>{requests.length=0;return world.project(12,8);});
    assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y).id,floor),'world','Floor tap is intercepted by an overlay');
    await touch('touchStart',[point(floor.x,floor.y)]);await touch('touchEnd',[]);
    assert.deepEqual(await page.evaluate(()=>requests),[]);
    assert.deepEqual(await page.evaluate(()=>({x:world.marker.x,y:world.marker.y})),{x:12,y:8});
    pass('uncovered-furniture-and-floor-remain-directly-tappable');

    // A swipe starting on a pin is a pan. The object must not be activated after releasing.
    await page.evaluate(()=>focusObject('piano'));
    const start=await centre(pin),cameraBefore=await page.evaluate(()=>({...world.camera}));
    await swipe(start,{x:start.x+126,y:start.y+58});
    const cameraAfter=await page.evaluate(()=>({...world.camera}));
    assert(Math.abs(cameraAfter.x-cameraBefore.x-126)<.2&&Math.abs(cameraAfter.y-cameraBefore.y-58)<.2,'A pin intercepts or truncates a pan');
    assert.deepEqual(await page.evaluate(()=>requests),[],'Swiping a pin must not activate it');
    const anchors=await page.evaluate(()=>pinErrors());
    assert(anchors.every(a=>a.x<.1&&a.y<.1),'Pins drift relative to world-space anchors after pan');
    pass('swipe-on-pin-pans-without-activation',{dx:cameraAfter.x-cameraBefore.x,dy:cameraAfter.y-cameraBefore.y,maxAnchorError:Math.max(...anchors.map(a=>Math.max(a.x,a.y)))});

    // Mouse input needs the same fixed geometry, independently of the touch implementation.
    await page.evaluate(()=>focusObject('memory'));
    const mousePin=page.locator('[data-object-id="memory"]'),mousePoint=await centre(mousePin);
    await page.mouse.move(mousePoint.x,mousePoint.y);await page.mouse.down();
    const mouseDown=await mousePin.boundingBox();
    assert(Math.abs(mouseDown.x+mouseDown.width/2-mousePoint.x)<.1,'Mouse press moves the pin');
    await page.mouse.up();assert.deepEqual(await page.evaluate(()=>requests),['memory']);
    pass('mouse-pin-activation');

    // Two fingers zoom about their midpoint and may simultaneously translate that midpoint.
    await page.evaluate(()=>{world.resetCamera();requests.length=0;for(const a of Object.values(world.actors))a.path=[];});
    const original=await page.evaluate(()=>({scale:world.camera.scale,anchor:world.unproject(650,380)}));
    await touch('touchStart',[point(595,380,1),point(705,380,2)]);
    for(let i=1;i<=8;i++){
      const half=55+115*i/8,midX=650+32*i/8,midY=380+24*i/8;
      await touch('touchMove',[point(midX-half,midY,1),point(midX+half,midY,2)]);await page.waitForTimeout(18);
    }
    await touch('touchEnd',[]);
    const zoomed=await page.evaluate(()=>({scale:world.camera.scale,anchor:world.unproject(682,404),pins:pinErrors(),min:world.minZoom,max:world.maxZoom}));
    assert(zoomed.scale>original.scale*3,'Pinch must zoom materially beyond the previous 2.2× limit');
    assert(Math.abs(zoomed.anchor.x-original.anchor.x)<.001&&Math.abs(zoomed.anchor.y-original.anchor.y)<.001,'The world slides under the pinch midpoint');
    assert(zoomed.pins.every(a=>a.x<.1&&a.y<.1),'Pins drift at high zoom');
    assert.deepEqual(await page.evaluate(()=>requests),[],'A pinch must not activate a pin');
    pass('pinch-zoom-keeps-world-point-under-moving-fingers',{ratio:zoomed.scale/original.scale,limits:{min:zoomed.min,max:zoomed.max}});

    const api=await page.evaluate(()=>{
      const anchor={x:720,y:320},before=world.unproject(anchor.x,anchor.y);
      world.zoomBy(100,anchor);const after=world.unproject(anchor.x,anchor.y),max=world.camera.scale;
      world.setZoom(.001,anchor);const min=world.camera.scale;world.resetCamera();
      return{before,after,max,min,fit:world.fit,overview:world.camera.scale,limitMax:world.maxZoom,limitMin:world.minZoom};
    });
    assert.equal(api.max,api.limitMax);assert.equal(api.min,api.limitMin);assert.equal(api.fit,api.overview);
    assert(Math.abs(api.before.x-api.after.x)<.001&&Math.abs(api.before.y-api.after.y)<.001);
    assert(api.max>=3.2&&api.max/api.fit>=4.5-.001);
    pass('zoom-controls-clamp-and-overview-resets',api);

    const synchronized=await page.evaluate(()=>{
      const before=world.canvas.toDataURL();world.zoomBy(1.3);const afterZoom=world.canvas.toDataURL();
      world.resetCamera();const afterReset=world.canvas.toDataURL();
      return{zoomPainted:before!==afterZoom,resetPainted:afterZoom!==afterReset,pins:pinErrors()};
    });
    assert(synchronized.zoomPainted&&synchronized.resetPainted,'Camera updates DOM pins before repainting the canvas');
    assert(synchronized.pins.every(a=>a.x<.1&&a.y<.1));
    pass('canvas-and-pins-update-together-even-with-reduced-motion');

    await page.evaluate(()=>focusObject('crib'));
    const cancelPoint=await centre(page.locator('[data-object-id="crib"]'));
    await touch('touchStart',[point(cancelPoint.x,cancelPoint.y)]);await touch('touchCancel',[]);
    assert.deepEqual(await page.evaluate(()=>requests),[]);assert.equal(await page.evaluate(()=>world.pointers.size),0);
    await page.evaluate(()=>world.setPaused(true));await tap(page.locator('[data-object-id="crib"]'));
    assert.deepEqual(await page.evaluate(()=>requests),[]);await page.evaluate(()=>world.setPaused(false));
    pass('cancelled-and-paused-touches-do-not-activate');

    // Complete one real travel/arrival, not just a spy call or direct onInteract invocation.
    await page.evaluate(()=>{
      focusObject('crib');const a=world.actors[state.selected],p=GameWorld.nearest(4,5);a.x=p.x;a.y=p.y;
    });
    await tap(page.locator('[data-object-id="crib"]'));
    await page.waitForFunction(()=>interactions.length===1,null,{timeout:4000});
    assert.deepEqual(await page.evaluate(()=>interactions),['care']);
    await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>interactions.length),1);
    pass('pin-routes-to-object-and-opens-one-action-on-arrival');

    // Tablet layouts: fixed anchors and practical minimum touch sizes remain intact after resize.
    for(const size of [{width:1024,height:600},{width:1280,height:800},{width:800,height:480}]){
      await page.setViewportSize(size);
      await page.waitForFunction(size=>world.width===size.width&&world.height===size.height,size);
      await page.evaluate(()=>focusObject('shapes'));
      const box=await page.locator('[data-object-id="shapes"]').boundingBox();
      assert(box.width>=48&&box.height>=48,'Destination pin is smaller than 48 pixels on '+size.width+'×'+size.height);
      const errors=await page.evaluate(()=>pinErrors());assert(errors.every(p=>p.x<.1&&p.y<.1),'Resize changed pin anchoring: '+JSON.stringify({size,errors}));
      await tap(page.locator('[data-object-id="shapes"]'));assert.deepEqual(await page.evaluate(()=>requests),['shapes']);
    }
    pass('tablet-layouts-retain-48px-touch-targets-and-fixed-anchors',{layouts:3});

    // Animated scenery and visits use active world time and honour reduced motion / pause.
    await page.setViewportSize({width:1280,height:800});
    const ambience=await page.evaluate(()=>{
      world.resetCamera();state.settings.reduceMotion=false;world.reduced=false;
      for(const a of Object.values(world.actors)){a.path=[];a.action=null;a.nextIdle=0;}
      world.update(.1);
      return{friends:Object.values(world.actors).filter(a=>a.role!==state.selected).map(a=>({role:a.role,walking:a.path.length>0,action:a.action?.kind||a.idleDestination})),selectedPath:world.actors[state.selected].path.length};
    });
    assert(ambience.friends.every(a=>a.walking||a.action));assert.equal(ambience.selectedPath,0);
    await page.waitForTimeout(800);await page.screenshot({path:'/tmp/sternenbaby-world-v11-preview.png'});
    await page.evaluate(()=>{state.settings.reduceMotion=true;world.update(.01);world.setPaused(true);});
    const pausedAt=await page.evaluate(()=>world.elapsed);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>world.elapsed),pausedAt);
    pass('friends-visit-activity-places-and-pause-freezes-world',ambience);

    // The real app chrome must wire the pictorial zoom buttons and route a pin to its game.
    const app=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});
    app.on('pageerror',error=>errors.push(error.message));
    await app.addInitScript(()=>{
      localStorage.setItem('sternenbaby.state.v1',JSON.stringify({version:2,started:true,mother:'rumi',selected:'rumi',story:3,babyName:'Luna',care:{},games:{},settings:{sound:false,music:false,reduceMotion:true,sessionMinutes:0},positions:{rumi:{x:4,y:8},mira:{x:9,y:5},zoey:{x:14,y:12}}}));
    });
    await app.goto(pathToFileURL(path.join(root,'www/index.html')).href);
    await app.waitForFunction(()=>window.Sternenbaby);
    const appFit=await app.evaluate(()=>Sternenbaby.world.camera.scale);
    await app.locator('#zoom-in').tap();assert(Math.abs(await app.evaluate(()=>Sternenbaby.world.camera.scale)-appFit*1.3)<.001);
    await app.locator('#zoom-out').tap();assert(Math.abs(await app.evaluate(()=>Sternenbaby.world.camera.scale)-appFit)<.001);
    await app.locator('#zoom-in').tap();await app.locator('#zoom-in').tap();await app.locator('#zoom-reset').tap();
    assert.equal(await app.evaluate(()=>Sternenbaby.world.camera.scale),appFit);
    assert.equal(await app.evaluate(()=>Sternenbaby.world.pointers.size),0,'Zoom controls start a world pan');
    await app.screenshot({path:'/tmp/sternenbaby-world-v11-app-preview.png'});
    await app.locator('[data-object-id="piano"]').tap();
    await app.waitForFunction(()=>Sternenbaby.activeGame,null,{timeout:5000});
    assert.equal(await app.locator('#mini-host').isVisible(),true);
    pass('real-app-zoom-buttons-and-pin-to-minigame-flow');
    await app.close();

    assert.deepEqual(errors,[]);await page.evaluate(()=>world.destroy());
    const report={version:'1.1',browser:'Chromium headless, CDP trusted touch events',androidHardwareTested:false,passed:true,results,errors};
    fs.mkdirSync(path.join(root,'verification'),{recursive:true});fs.writeFileSync(path.join(root,'verification/world-touch-v11.json'),JSON.stringify(report,null,2)+'\n');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
