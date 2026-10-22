'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.goto(pathToFileURL(path.join(root,'www/index.html')).href);await page.waitForFunction(()=>window.Sternenbaby);
 await page.evaluate(()=>{GameState.data.started=true;GameState.data.story=3;GameState.data.settings.sound=false;GameState.data.settings.sessionMinutes=0;Sternenbaby.resume();});
 const shot=async(name)=>page.screenshot({path:'/tmp/sternenbaby-v11-'+name+'.png'});
 const next=async()=>{await page.locator('.care-next').waitFor({state:'visible'});await page.locator('.care-next').click();};
 const tapFour=async()=>{for(let i=0;i<4;i++)await page.locator('.care-action-orb').tap();};
 const finish=async id=>{
  await page.locator('[data-care-finish]').waitFor({state:'visible'});
  assert.equal(await page.evaluate(id=>GameState.data.care[id],id),1);
  await page.getByRole('button',{name:'Das war schön!',exact:true}).click();
  assert.equal(await page.evaluate(()=>Sternenbaby.careActivity),null);results.push(id);
 };
 try{
  await shot('world');await page.evaluate(()=>Sternenbaby.showGames());await page.waitForTimeout(250);await shot('games');
  await page.evaluate(()=>Sternenbaby.care('feed'));await page.waitForTimeout(200);await shot('wash');
  // A real swipe on the action area washes hands; taps remain an equivalent alternative.
  const box=await page.locator('.care-action-orb').boundingBox();
  await page.mouse.move(box.x+25,box.y+40);await page.mouse.down();
  for(let i=0;i<5;i++){await page.mouse.move(box.x+66,box.y+40,{steps:3});await page.mouse.move(box.x+15,box.y+40,{steps:3});}
  await page.mouse.up();await next();
  const tool=page.locator('[data-draggable]'),target=page.locator('[data-dropzone]');
  // Two-tap alternative to drag is usable by a child who cannot reliably drag.
  await tool.tap();await target.tap();await page.waitForTimeout(700);await shot('feed');
  const before=await page.evaluate(()=>{dispatchEvent(new Event('nativepause'));return Sternenbaby.careActivity.snapshot.progress;});await page.waitForTimeout(450);
  assert.equal(await page.evaluate(()=>Sternenbaby.careActivity.snapshot.progress),before);
  await page.evaluate(()=>dispatchEvent(new Event('nativeresume')));await next();await tapFour();await finish('feed');
  await page.evaluate(()=>Sternenbaby.care('fresh'));
  for(const item of ['cloth','nappy','shirt'])await page.locator('[data-supply="'+item+'"]').tap();await next();await tapFour();await next();
  await page.locator('[data-outfit="2"]').tap();await page.locator('.care-confirm').tap();await finish('fresh');
  assert.equal(await page.evaluate(()=>GameState.data.outfit),2);
  await page.evaluate(()=>Sternenbaby.care('play'));await tapFour();await next();
  for(let i=0;i<3;i++){await page.locator('.care-action-orb').tap();await page.waitForTimeout(720);}await next();await page.locator('.care-action-orb').tap();await finish('play');
  await page.evaluate(()=>Sternenbaby.care('sleep'));for(let i=0;i<3;i++)await page.locator('.care-action-orb').tap();await next();
  for(const note of [60,64,67])await page.locator('[data-note="'+note+'"]').tap();await next();
  const a=await page.locator('[data-draggable]').boundingBox(),b=await page.locator('[data-dropzone]').boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();await finish('sleep');
  // Native pause during the queued step transition must not advance it offscreen.
  await page.evaluate(()=>Sternenbaby.care('feed'));await tapFour();await page.evaluate(()=>dispatchEvent(new Event('nativepause')));await page.waitForTimeout(1100);
  assert.equal(await page.locator('.care-next').isVisible(),false);await page.evaluate(()=>dispatchEvent(new Event('nativeresume')));await next();
  // Interrupting an activity does not count it as completed; opening another clears all callbacks.
  await page.evaluate(()=>Sternenbaby.showGames());await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>GameState.data.care.feed),1);
  const layouts=[];
  for(const [width,height]of [[1024,600],[1280,800],[800,480],[800,1280]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>{document.getElementById('orientation').classList.add('dismissed');Sternenbaby.care('feed');});await page.waitForTimeout(160);
   const geometry=await page.evaluate(()=>{const panel=document.querySelector('.panel'),root=document.querySelector('.care-play');return{overflow:root.scrollWidth-root.clientWidth,controls:[...root.querySelectorAll('button')].filter(b=>!b.hidden).map(b=>{const r=b.getBoundingClientRect();return[Math.round(r.width),Math.round(r.height)];}),panelWidth:panel.getBoundingClientRect().width};});
   assert(geometry.overflow<=1);assert(geometry.controls.every(([w,h])=>w>=44&&h>=44));layouts.push({width,height,...geometry});
  }
  assert.deepEqual(errors,[]);
  const report={status:'passed',activities:results,nativePause:true,tapAndDrag:true,layouts,errors};fs.writeFileSync(path.join(root,'verification/care-v11.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
