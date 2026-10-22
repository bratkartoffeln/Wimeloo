// Regression for direct object taps after scene letterboxing and idle narration.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox']});const results=[];
 for(const viewport of [{width:1024,height:600},{width:800,height:480}]){
  const p=await b.newPage({viewport,hasTouch:true});p.setDefaultTimeout(6000);await p.goto(pathToFileURL(path.join(root,'www/index.html')).href);await p.waitForFunction(()=>window.Sternenbaby);await p.evaluate(()=>{GameState.data.story=3;GameState.data.settings.sound=false;GameState.data.settings.sessionMinutes=0;});
  async function care(id){await p.evaluate(id=>Sternenbaby.care(id),id);await p.waitForTimeout(140);}
  async function point(x,y){return p.locator('.care-theatre canvas').evaluate((c,[x,y])=>{const r=c.getBoundingClientRect(),s=Math.min(r.width/900,r.height/340);return{x:r.x+(r.width-900*s)/2+x*s,y:r.y+(r.height-340*s)/2+y*s};},[x,y]);}
  async function tap(x,y){const a=await point(x,y);await p.touchscreen.tap(a.x,a.y);return a;}
  async function filled(){return p.locator('.care-touch-progress .filled').count();}
  for(const [id,label,points] of [['feed','wash',[[320,249],[264,250],[373,249]]],['sleep','lamp',[[830,95],[804,110],[858,111]]],['play','rattle',[[723,192],[706,185],[730,230]]]]){
   for(const [x,y] of points){await care(id);const at=await tap(x,y);await p.waitForTimeout(150);results.push({viewport,label,logical:[x,y],screen:at,progress:await filled()});}
   await p.screenshot({path:`/tmp/sb-hotspot-fixed-${viewport.width}-${label}.png`});
  }
  await care('play');for(let i=0;i<4;i++)await tap(723,192);await p.locator('.care-next').waitFor({state:'visible'});await p.locator('.care-next').click();
  for(const [x,y] of [[635,211],[583,211],[685,211]]){const before=await filled();const at=await tap(x,y);await p.waitForTimeout(730);results.push({viewport,label:'peek',logical:[x,y],screen:at,before,progress:await filled()});}
  await p.screenshot({path:`/tmp/sb-hotspot-fixed-${viewport.width}-peek.png`});
  await care('fresh');
  for(const [i,x] of [[0,410],[1,490],[2,570]]){const at=await tap(x,290);await p.waitForTimeout(150);results.push({viewport,label:'supply'+i,logical:[x,290],screen:at,selected:await p.locator('[data-supply]').nth(i).isDisabled(),progress:await filled()});}
  await p.waitForTimeout(800);await p.screenshot({path:`/tmp/sb-hotspot-fixed-${viewport.width}-supplies.png`});
  // Wait until the initial guide ends. Compare only the rendered rattle, not the UI badge.
  await care('play');await p.waitForTimeout(1800);
  async function crop(){return p.locator('.care-theatre canvas').evaluate(c=>{const w=c.clientWidth,h=c.clientHeight,s=Math.min(w/900,h/340),d=c.width/w,x=(w-900*s)/2+703*s,y=(h-340*s)/2+175*s;return Array.from(c.getContext('2d').getImageData(Math.floor(x*d),Math.floor(y*d),Math.ceil(40*s*d),Math.ceil(45*s*d)).data);});}
  const before=await crop();await tap(723,192);await p.waitForTimeout(180);const after=await crop();let different=0;for(let i=0;i<before.length;i++)if(before[i]!==after[i])different++;results.push({viewport,label:'rattleMovementAfterIdle',changedChannels:different});
  await p.close();
 }
 await b.close();
 for(const result of results){if(result.label==='rattleMovementAfterIdle')assert(result.changedChannels>80,'Rattle must visibly move after an idle tap');else if(result.label.startsWith('supply'))assert(result.selected,'Tap the visible supply directly');else assert(result.progress>(result.before||0),'Visible object tap must progress the activity');}
 const report={passed:true,checks:results.length,scope:'Real touch input at visible object centres and edges; canvas-region change after idle tap',results};
 fs.writeFileSync(path.join(root,'verification/care-hotspots-v11.json'),JSON.stringify(report,null,2)+'\n');console.log('Care hotspots passed: '+results.length+' direct object/animation checks.');
})().catch(e=>{console.error(e);process.exit(1)});
