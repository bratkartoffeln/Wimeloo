/* Regression checks for world reactions, lifecycle and the three new destinations. */
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox']});
  const page = await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<html><head><style>html,body{margin:0;width:100%;height:100%}canvas{width:100%;height:100%;display:block}#floating-actions{position:fixed;inset:0;pointer-events:none}.game-location{position:absolute;transform:translate(-50%,-100%);display:flex;gap:5px;align-items:center;padding:6px 9px;border:1px solid #e0d4e6;background:#fffaf4;color:#675078;border-radius:20px;font:13px sans-serif}.game-location svg{width:20px;height:20px}</style></head><body><canvas id="world"></canvas><div id="floating-actions"></div></body></html>');
  await page.addScriptTag({path:path.join(root,'www/art.js')});
  await page.addScriptTag({path:path.join(root,'www/world.js')});
  await page.evaluate(()=>{
    window.state={positions:{rumi:{x:8,y:7},mira:{x:9,y:5},zoey:{x:5,y:8}},settings:{reduceMotion:false},selected:'rumi',mother:'rumi',story:3,babyStage:2,lastCare:'none',wall:0,outfit:0,decorations:['bunting','lanterns','rainbow','cushions','starMobile','flowerArch']};
    window.interactions=[];window.world=new GameWorld.World(document.querySelector('canvas'),state,{icon:Art.icon,onInteract:action=>interactions.push(action)});
  });
  const destinations=await page.evaluate(()=>GameWorld.objects.filter(o=>['shapes','memory','patterns'].includes(o.action)).map(o=>({action:o.action,reachable:GameWorld.objects.filter(x=>x.action===o.action).length===1&&Array.from({length:5},(_,i)=>Math.floor(o.x)-2+i).some(x=>Array.from({length:5},(_,i)=>Math.floor(o.y)-2+i).some(y=>GameWorld.walkable(x,y)&&GameWorld.pathfind({x:8,y:7},{x,y}).length>0))})));
  assert.equal(destinations.length,3);assert(destinations.every(d=>d.reachable));
  await page.evaluate(()=>{world.react('feed');world.setPaused(true);});
  const frozen=await page.evaluate(()=>world.snapshot());
  await page.waitForTimeout(240);
  const afterPause=await page.evaluate(()=>world.snapshot());
  assert.equal(afterPause.reaction.remaining,frozen.reaction.remaining,'A paused panel consumes the reaction');
  assert.equal(afterPause.elapsed,frozen.elapsed,'World clock runs while paused');
  assert.equal(afterPause.actors.rumi.holdingBaby,true);
  await page.evaluate(()=>world.setPaused(false));await page.waitForTimeout(240);
  assert((await page.evaluate(()=>world.snapshot().reaction.remaining))<frozen.reaction.remaining,'Reaction does not resume');
  await page.evaluate(()=>{world.react('celebrate',{duration:1});});await page.waitForTimeout(1250);
  const finished=await page.evaluate(()=>world.snapshot());assert.equal(finished.reaction,null);assert(Object.values(finished.actors).every(a=>!a.holdingBaby),'Baby remains attached after reaction');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  const hidden=await page.evaluate(()=>world.elapsed);await page.waitForTimeout(240);assert.equal(await page.evaluate(()=>world.elapsed),hidden,'Hidden world still animates');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));world.react('music');});
  await page.waitForTimeout(350);
  await page.screenshot({path:path.join(root,'tests','world-v1.png')});
  await page.evaluate(()=>{state.settings.reduceMotion=true;world.react('wash');world.update(.02);world.render(world.elapsed*1000);});
  assert.equal(await page.evaluate(()=>world.reduced),true);
  // Every developmental phase and action must render without depending on a browser font or image.
  await page.evaluate(()=>{const c=document.querySelector('canvas').getContext('2d');for(let stage=0;stage<3;stage++){Art.drawBaby(c,100+stage*80,100,2,false,'#b4c8de',{stage,time:4200,reaction:'play'});Art.drawBaby(c,100+stage*80,200,2,true,'#b4c8de',{stage,time:4200});}for(const action of ['wave','celebrate','music','feed','wash','play','sleep'])Art.drawCharacter(c,{x:600,y:350,role:'mira',time:4200,action,actionProgress:.5});});
  await page.evaluate(()=>world.destroy());const last=await page.evaluate(()=>world.elapsed);await page.waitForTimeout(240);assert.equal(await page.evaluate(()=>world.elapsed),last,'destroy() leaves an animation loop');
  assert.deepEqual(errors,[]);
  await browser.close();console.log('World v1 passed: new destinations, pause/resume, baby carrying, hidden lifecycle, reduced motion, artwork and destruction.');
})().catch(error=>{console.error(error);process.exit(1);});
