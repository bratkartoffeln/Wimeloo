/* Behavioural acceptance for the six learning islands, independent of shell UI. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<!doctype html><html lang="de"><head><style>html,body{margin:0;width:100%;height:100%}.mini-host{position:fixed;inset:0}</style></head><body><div class="mini-host"></div></body></html>');
 await page.addStyleTag({content:fs.readFileSync(path.join(__dirname,'../www/minigames.css'),'utf8')});
 await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../www/minigames.js'),'utf8')});
 await page.evaluate(()=>{
   window.results=[];window.spoken=[];window.notes=[];window.closed=0;
   window.openGame=(type,difficulty=1,reducedMotion=false)=>window.handle=Minigames.open(type,{container:document.querySelector('.mini-host'),difficulty,reducedMotion,speak:t=>spoken.push(t),sound:n=>notes.push(n),onComplete:r=>results.push(r),onClose:()=>closed++});
 });
 const types=['sorting','counting','music','shapes','memory','patterns'];
 for(const difficulty of [1,2,3])for(const type of types){
   await page.evaluate(({type,difficulty})=>openGame(type,difficulty),{type,difficulty});
   const initial=await page.locator('.mg-instruction').textContent();assert.ok(initial.length>10);
   for(let round=0;round<3;round++){
     await page.evaluate(({type,round})=>{
       const click=q=>{const el=document.querySelector(q);if(!el||el.disabled)throw Error('Unavailable '+q);el.click();};
       if(type==='sorting'){
         while(document.querySelector('[data-action="select-sort"]:not(:disabled)')){
           const id=document.querySelector('[data-action="select-sort"]:not(:disabled)').dataset.id;
           click('[data-action="select-sort"][data-id="'+id+'"]');click('[data-action="place-sort"][data-id="'+id+'"]');
         }
       }else if(type==='counting'){
         const amount=document.querySelectorAll('.mg-person').length;
         if(round===0){const wrong=amount===1?2:1;click('[data-action="choose-count"][data-amount="'+wrong+'"]');click('[data-action="check-count"]');if(document.querySelector('[data-action="next"]'))throw Error('Wrong count advanced round');}
         click('[data-action="choose-count"][data-amount="'+amount+'"]');click('[data-action="check-count"]');
       }else if(type==='music'){
         click('[data-action="help"]');const labels=[...document.querySelectorAll('.mg-target-strip .mg-sr-only')].map(x=>x.textContent);
         labels.forEach(label=>[...document.querySelectorAll('[data-action="note"]')].find(x=>x.textContent.trim()===label).click());
         click('[data-action="check-music"]');
       }else if(type==='shapes'){
         if(round===0){const id=document.querySelector('[data-action="select-seed"]').dataset.id;click('[data-action="select-seed"][data-id="'+id+'"]');const wrong=[...document.querySelectorAll('[data-action="plant-seed"]')].find(x=>x.dataset.id!==id);wrong.click();if(document.querySelector('.is-grown'))throw Error('Wrong shape planted');click('[data-action="help"]');}
         while(document.querySelector('[data-action="select-seed"]:not(:disabled)')){
           const id=document.querySelector('[data-action="select-seed"]:not(:disabled)').dataset.id;click('[data-action="select-seed"][data-id="'+id+'"]');click('[data-action="plant-seed"][data-id="'+id+'"]');
         }
       }else if(type==='memory'){
         if(round===0){const a=document.querySelector('[data-action="memory-card"]');const b=[...document.querySelectorAll('[data-action="memory-card"]')].find(x=>x.dataset.picture!==a.dataset.picture);const bi=b.dataset.card;a.click();document.querySelector('[data-card="'+bi+'"]').click();if(document.querySelectorAll('.mg-memory-card.is-open').length!==2)throw Error('Mismatch not visible');click('[data-action="memory-again"]');if(document.querySelectorAll('.mg-memory-card.is-open').length)throw Error('Mismatch did not turn back');}
         while(document.querySelector('[data-action="memory-card"]:not(:disabled)')){
           const a=document.querySelector('[data-action="memory-card"]:not(:disabled)'),symbol=a.dataset.picture;a.click();const b=[...document.querySelectorAll('[data-action="memory-card"]:not(:disabled)')].find(x=>x.dataset.picture===symbol&&!x.classList.contains('is-open'));if(!b)throw Error('Missing pair');b.click();
         }
       }else if(type==='patterns'){
         while(!document.querySelector('[data-action="next"]')){
           click('[data-action="help"]');const choice=document.querySelector('[data-action="pattern-choice"].is-hint');if(!choice)throw Error('Missing pattern hint');choice.click();
         }
       }
       if(document.querySelectorAll('.mg-progress .is-done').length!==round+1)throw Error('Progress mismatch '+type+' '+round);
       click('[data-action="next"]');
     },{type,round});
   }
   if(type==='music'){await page.locator('[data-action="undo-note"]').click();await page.locator('[data-action="note"][data-note="69"]').click();await page.locator('[data-action="finish-music"]').click();}
   else await page.locator('[data-action="finish"]').click();
   assert.equal(await page.locator('.mini-host').evaluate(el=>el.childElementCount),0);
 }
 const results=await page.evaluate(()=>results);assert.equal(results.length,18);assert.ok(results.every(x=>x.score===3));assert.ok(results.filter(x=>x.gameId==='music').every(x=>x.creation.notes.length>1));assert.ok(results.filter(x=>x.gameId==='shapes').every(x=>x.creation.flowers.length===x.difficulty+1));
 const unknown=await page.evaluate(()=>[...new Set(spoken.filter(x=>!Minigames.voiceLines.includes(x)))]);assert.deepEqual(unknown,[]);
 // Playback cancellation preserves the learner's current sequence and stops future notes.
 await page.evaluate(()=>{openGame('music',3);document.querySelector('[data-action="note"]').click();document.querySelector('[data-action="hear-melody"]').click();handle.setPaused(true);});
 const atPause=await page.evaluate(()=>({notes:notes.length,input:document.querySelector('.mg-input-strip').textContent}));
 await page.waitForTimeout(1450);assert.deepEqual(await page.evaluate(()=>({notes:notes.length,input:document.querySelector('.mg-input-strip').textContent})),atPause);
 await page.evaluate(()=>handle.setPaused(false));assert.equal(await page.locator('.mg-game').evaluate(x=>x.inert),false);
 await page.evaluate(()=>{document.querySelector('[data-action="hear-melody"]').click();handle.destroy();});const atDestroy=await page.evaluate(()=>notes.length);await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>notes.length),atDestroy);assert.equal(await page.locator('.mg-game').count(),0);
 // No automatic timeout hides memory cards: they remain until the child is ready.
 await page.evaluate(()=>{openGame('memory',3);const a=document.querySelector('[data-action="memory-card"]');const b=[...document.querySelectorAll('[data-action="memory-card"]')].find(x=>x.dataset.picture!==a.dataset.picture);const bi=b.dataset.card;a.click();document.querySelector('[data-card="'+bi+'"]').click();});
 await page.waitForTimeout(1300);assert.equal(await page.locator('.mg-memory-card.is-open').count(),2);
 const layout=[];
 for(const size of [{width:1280,height:800},{width:1024,height:600},{width:800,height:480},{width:390,height:844}]){
  await page.setViewportSize(size);
  for(const type of types){
   await page.evaluate(t=>openGame(t,3),type);
   const metrics=await page.locator('.mg-game').evaluate(g=>({overflow:g.scrollWidth-g.clientWidth,smallTargets:[...g.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width<48||r.height<48;}).map(x=>({action:x.dataset.action,w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height}))}));
   assert.ok(metrics.overflow<2,`Horizontal overflow ${type} ${size.width}: ${metrics.overflow}`);assert.deepEqual(metrics.smallTargets,[],`Small targets ${type} ${size.width}`);
   layout.push({type,...size,...metrics});
   if(process.env.MINIGAME_SCREENSHOTS&&size.width===800)await page.screenshot({path:path.join(process.env.MINIGAME_SCREENSHOTS,'minigame-v1-'+type+'.png')});
  }
 }
 await page.evaluate(()=>openGame('shapes',3,true));assert.equal(await page.locator('.mg-game.mg-reduced-motion').count(),1);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({completed:results.length,rounds:54,voiceLinesCovered:true,pauseCancelsPlayback:true,destroyCancelsPlayback:true,memoryWaitsForChild:true,layouts:layout,pageErrors:errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
