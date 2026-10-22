const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../www/index.html')).href);
 await page.waitForFunction(()=>window.Sternenbaby);
 fs.writeFileSync(path.resolve(__dirname,'voice-required-v1.json'),JSON.stringify(await page.evaluate(()=>[...new Set([...AppVoiceLines,...Minigames.voiceLines])]),null,2));
 await page.getByRole('button',{name:'Los geht’s!',exact:true}).click();
 await page.getByRole('button',{name:'Wir machen uns bereit',exact:true}).click();
 await page.getByRole('button',{name:'Weiter zur Geburt',exact:true}).click();
 await page.getByRole('button',{name:'Das Baby begrüßen',exact:true}).click();
 await page.getByRole('button',{name:'Ab nach Hause',exact:true}).click();
 await page.evaluate(()=>{GameState.data.settings.sound=false;GameState.data.settings.sessionMinutes=0;GameState.data.decorations=['bunting','lanterns','rainbow','cushions','starMobile','flowerArch'];Sternenbaby.world.dirty=true;});
 await page.waitForTimeout(150);await page.screenshot({path:'/tmp/sternenbaby-v1-world.png'});
 const layouts=[];
 for(const size of [{width:1280,height:800},{width:800,height:480}]){
  await page.setViewportSize(size);
  for(const mode of ['showGames','showDaily','showPassport','showDecorate','showParents','concert']){
   await page.evaluate(mode=>Sternenbaby[mode](),mode);
   await page.waitForTimeout(100);await page.screenshot({path:`/tmp/sternenbaby-v1-${mode}-${size.width}.png`});
   layouts.push(await page.locator('.panel').evaluate((p,context)=>({mode:context.mode,width:context.width,overflow:p.scrollWidth-p.clientWidth,height:p.getBoundingClientRect().height}),{mode,width:size.width}));
  }
 }
 await page.evaluate(()=>Sternenbaby.care('play'));await page.locator('.care-step.active').click();await page.waitForTimeout(100);await page.screenshot({path:'/tmp/sternenbaby-v1-care.png'});
 console.log(JSON.stringify({errors,layouts},null,2));await browser.close();if(errors.length||layouts.some(x=>x.overflow>2))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
