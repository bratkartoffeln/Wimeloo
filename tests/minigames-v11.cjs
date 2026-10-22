/* Acceptance tests for the 1.1 hands-on workshops. Interactions use real
   browser clicks/touch drags, including mistakes, pause/resume and all levels. */
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html lang="de"><head><style>html,body{margin:0;width:100%;height:100%}.mini-host{position:fixed;inset:0}</style></head><body><div class="mini-host"></div></body></html>');
  await page.addStyleTag({path:path.join(root,'www/minigames.css')});
  await page.addScriptTag({path:path.join(root,'www/art.js')});
  await page.addScriptTag({path:path.join(root,'www/minigames.js')});
  await page.evaluate(()=>{window.results=[];window.spoken=[];window.notes=[];window.closed=0;window.openGame=(type,difficulty=1,reducedMotion=false)=>window.handle=Minigames.open(type,{container:document.querySelector('.mini-host'),difficulty,reducedMotion,speak:t=>spoken.push(t),sound:n=>notes.push(n),onComplete:r=>results.push(r),onClose:()=>closed++});});
  const click=selector=>page.locator(selector).click();
  const waitMotion=()=>page.waitForFunction(()=>!handle.snapshot().transition);
  const has=selector=>page.locator(selector).count();
  const touch=await page.context().newCDPSession(page);
  const drag=async(from,to)=>{const a=await page.locator(from).boundingBox(),b=await page.locator(to).boundingBox();assert(a&&b);const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=8;i++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/8,y:y+(ty-y)*i/8,id:1}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(510);};
  let pauseChecked=false,dragCount=0,mistakesExercised=0;
  for(const difficulty of [1,2,3])for(const type of ['sorting','counting','music','shapes','memory','patterns']){
   // Full motion is exercised at the demanding level. Lower levels use the
   // supported reduce-motion path to cover both render/lifecycle branches.
   await page.evaluate(({type,difficulty})=>openGame(type,difficulty,difficulty<3),{type,difficulty});
   for(let round=0;round<3;round++){
    if(type==='sorting'){
     if(round===0){await page.locator('[data-action="select-sort"][data-correct="false"]').first().click();await click('[data-action="place-sort"]');assert.equal(await has('[data-action="next"]'),0);mistakesExercised++;}
     let steps=0;while(!await has('[data-action="next"]')){assert(++steps<=4);if(difficulty===3&&round===0&&steps===1){await drag('[data-action="select-sort"][data-correct="true"]','[data-action="place-sort"]');dragCount++;}else{await click('[data-action="select-sort"][data-correct="true"]');await click('[data-action="place-sort"]');}await waitMotion();}
    }else if(type==='counting'){
     const needed=await page.locator('.mg-person:not(.is-served)').count();
     if(round===0){await click('[data-action="serve-mode"]');assert.equal(await has('[data-action="next"]'),0);mistakesExercised++;}
     for(let i=0;i<needed+(needed<8?1:0);i++)await click('[data-action="add-cup"]');
     await click('[data-action="serve-mode"]');
     while(await has('.mg-person:not(.is-served)')){await page.locator('.mg-person:not(.is-served)').first().click();await waitMotion();}
     if(needed<8){assert.equal(await has('[data-action="next"]'),0,'An extra cup must be returned');await click('[data-action="remove-cup"]');}
    }else if(type==='music'){
     if(difficulty===3&&round===0){await click('[data-action="hear-melody"]');assert.equal(await page.evaluate(()=>handle.snapshot().playing),true);await page.waitForFunction(()=>!handle.snapshot().playing);}
     await click('[data-action="help"]');const target=await page.locator('.mg-target-strip [data-note]').evaluateAll(els=>els.map(x=>Number(x.dataset.note)));
     if(round===0){const all=await page.locator('[data-action="note"]').evaluateAll(els=>els.map(x=>Number(x.dataset.note)));for(const n of target)await click('[data-action="note"][data-note="'+(all.find(v=>v!==n))+'"]');await click('[data-action="check-music"]');assert.equal(await has('[data-action="next"]'),0);mistakesExercised++;}
     for(const n of target)await click('[data-action="note"][data-note="'+n+'"]');await click('[data-action="check-music"]');
    }else if(type==='shapes'){
     const ids=await page.locator('[data-action="select-seed"]').evaluateAll(els=>els.map(x=>x.dataset.id));
     if(round===0){await click('[data-action="select-seed"][data-id="'+ids[0]+'"]');await click('[data-action="plant-seed"][data-id="'+ids[1]+'"]');assert.equal(await has('.mg-garden-bed.is-planted'),0);mistakesExercised++;}
     for(let i=0;i<ids.length;i++){
      const id=ids[i],source='[data-action="select-seed"][data-id="'+id+'"]',target='[data-action="plant-seed"][data-id="'+id+'"]';
      await click(source);let rotations=0;
      while(difficulty===3){let current=Number(await page.locator(source).getAttribute('data-rotation')),goal=Number(await page.locator(target).getAttribute('data-rotation'));let modulus=id==='circle'?1:id==='square'?90:id==='rectangle'?180:id==='hexagon'?60:360;if(current%modulus===goal%modulus)break;assert(rotations++<4);await click('[data-action="rotate-seed"]');}
      if(difficulty===3&&round===0&&i===0){await drag(source,target);dragCount++;}else await click(target);await waitMotion();
      assert(await page.locator(target).evaluate(x=>x.classList.contains('is-planted')));
      if(!await page.locator('[data-action="water-tool"]').evaluate(x=>x.classList.contains('is-selected')))await click('[data-action="water-tool"]');await click(target);
      if(difficulty===3&&!pauseChecked){await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>handle.snapshot().transition),'water');await page.evaluate(()=>handle.setPaused(true));const frozen=await page.evaluate(()=>handle.snapshot());await page.waitForTimeout(350);assert.deepEqual(await page.evaluate(()=>handle.snapshot()),frozen);assert.equal(await page.locator(target).evaluate(x=>x.classList.contains('is-grown')),false);await page.evaluate(()=>handle.setPaused(false));pauseChecked=true;}
      await waitMotion();assert(await page.locator(target).evaluate(x=>x.classList.contains('is-grown')));
     }
    }else if(type==='memory'){
     assert((await page.locator('.mg-memory-card.is-open').count())>=6);await click('[data-action="memory-start"]');assert.equal(await page.locator('.mg-memory-card.is-open').count(),0);
     if(round===0){const data=await page.locator('.mg-memory-card').evaluateAll(els=>els.map(x=>({id:x.dataset.picture,index:x.dataset.card})));const a=data[0],b=data.find(x=>x.id!==a.id);await click('[data-card="'+a.index+'"]');await click('[data-card="'+b.index+'"]');await page.waitForTimeout(600);assert.equal(await page.locator('.mg-memory-card.is-open').count(),2);await click('[data-action="memory-again"]');mistakesExercised++;}
     const data=await page.locator('.mg-memory-card').evaluateAll(els=>els.map(x=>({id:x.dataset.picture,index:x.dataset.card})));for(const id of new Set(data.map(x=>x.id))){let pair=data.filter(x=>x.id===id);await click('[data-card="'+pair[0].index+'"]');await click('[data-card="'+pair[1].index+'"]');}
    }else if(type==='patterns'){
     let filled=0;while(await has('[data-action="pattern-hole"]')){if(difficulty===3&&round===0&&filled===0)await page.locator('[data-action="pattern-hole"]').last().click();await click('[data-action="help"]');if(round===0&&filled===0){let wrong=page.locator('[data-action="pattern-choice"]:not(.is-hint)').first();let before=await has('[data-action="pattern-hole"]');await wrong.click();assert.equal(await has('[data-action="pattern-hole"]'),before);await click('[data-action="help"]');mistakesExercised++;}
      if(difficulty===3&&round===0&&filled===0){await drag('[data-action="pattern-choice"].is-hint','[data-action="pattern-hole"].is-current');dragCount++;}else await click('[data-action="pattern-choice"].is-hint');await waitMotion();assert(++filled<=6);}
     assert.equal(await has('[data-action="next"]'),0,'The light switch is a real final action');await click('[data-action="light-pattern"]');await waitMotion();
    }
    assert.equal(await page.locator('.mg-progress .is-done').count(),round+1,type+' progress');
    if(difficulty===3&&round===2&&process.env.MINIGAME_SCREENSHOTS)await page.screenshot({path:path.join(process.env.MINIGAME_SCREENSHOTS,'minigame-v11-finished-'+type+'.png')});
    await click('[data-action="next"]');
   }
   if(type==='music'){await click('[data-action="undo-note"]');await click('[data-action="note"][data-note="69"]');await click('[data-action="finish-music"]');}else await click('[data-action="finish"]');
   assert.equal(await page.locator('.mg-game').count(),0);console.log('PASS',type,difficulty);
  }
  assert.equal((await page.evaluate(()=>results.length)),18);assert.equal(dragCount,3);assert(pauseChecked);
  const result=await page.evaluate(()=>results);assert(result.every(r=>r.score===3&&r.creation));assert(result.filter(r=>r.gameId==='sorting').every(r=>r.creation.items.length===r.difficulty+1));
  const unknown=await page.evaluate(()=>[...new Set(spoken.filter(t=>!Minigames.voiceLines.includes(t)))]);assert.deepEqual(unknown,[]);
  // Audio stops and no delayed callback survives destruction.
  await page.evaluate(()=>{openGame('music',3);document.querySelector('[data-action="hear-melody"]').click();handle.setPaused(true);});const pausedNotes=await page.evaluate(()=>notes.length);await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>notes.length),pausedNotes);await page.evaluate(()=>handle.setPaused(false));await click('[data-action="hear-melody"]');await page.waitForTimeout(250);await page.evaluate(()=>handle.destroy());const destroyedNotes=await page.evaluate(()=>notes.length);await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>notes.length),destroyedNotes);
  const layouts=[];
  for(const [width,height] of [[1280,800],[1024,600],[800,480],[390,844]]){await page.setViewportSize({width,height});for(const type of ['sorting','counting','music','shapes','memory','patterns']){await page.evaluate(t=>openGame(t,3),type);const metric=await page.locator('.mg-game').evaluate(g=>({overflow:g.scrollWidth-g.clientWidth,smallTargets:[...g.querySelectorAll('button')].filter(b=>{let r=b.getBoundingClientRect();return r.width<55.9||r.height<55.9;}).map(b=>b.dataset.action)}));assert(metric.overflow<2);assert.deepEqual(metric.smallTargets,[],type+' '+width);layouts.push({type,width,height,...metric});}}
  assert.deepEqual(errors,[]);const report={completed:18,rounds:54,voiceLinesCovered:true,narrationCount:await page.evaluate(()=>Minigames.voiceLines.length),touchDrags:dragCount,pausedWateringResumes:true,pauseCancelsPlayback:true,destroyCancelsPlayback:true,memoryWaitsForChild:true,mistakePathsExercised:mistakesExercised,minimumTouchTarget:56,layouts,pageErrors:errors};
  fs.mkdirSync(path.join(root,'verification'),{recursive:true});fs.writeFileSync(path.join(root,'verification/minigames-v11.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
