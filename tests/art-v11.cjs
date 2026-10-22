/* Anatomy and visual-action regression checks. Contact sheets stay in /tmp. */
'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<body style="margin:0;background:#ece6f3"><canvas width="1600" height="1200"></canvas></body>');
 await page.addScriptTag({path:path.join(root,'www/art.js')});
 const result=await page.evaluate(()=>{
  const roles=['rumi','mira','zoey'],faces=['se','sw','ne','nw'],actions=['','wave','music','celebrate','feed','wash','fresh','play','sleep'];
  let poses=0;
  for(const role of roles)for(const facing of faces)for(const pregnant of [false,true])for(const holdingBaby of [false,true])for(const action of actions)for(const time of [0,345,1234,4312]){
   const pose=Art.characterPose({role,facing,pregnant,holdingBaby,action,time,moving:true,walk:.3});
   if(pose.arms.length!==2||pose.legs.length!==2)throw new Error('A character has extra limbs');
   if(pose.arms.map(a=>a.side).join(',')!=='left,right')throw new Error('Arm identity lost');
   for(const arm of pose.arms){for(const pt of [arm.shoulder,arm.elbow,arm.hand])if(!pt.every(Number.isFinite))throw new Error('Non-finite joint');
     if(Math.hypot(arm.hand[0]-arm.elbow[0],arm.hand[1]-arm.elbow[1])>45)throw new Error('Detached hand');}
   poses++;
  }
  const c=document.querySelector('canvas').getContext('2d');
  // Same elapsed time may not animate a reduced-motion scene, but direct progress must still update it.
  function pixels(type,step,progress,time,reducedMotion){c.clearRect(0,0,900,340);Art.drawCareScene(c,{width:900,height:340,type,step,progress,time,reducedMotion,role:'rumi',stage:0,active:true});return c.getImageData(0,0,900,340).data;}
  function changed(a,b){let n=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])n++;return n;}
  const stages=[];
  for(const type of ['feed','fresh','play','sleep'])for(let step=0;step<3;step++){
   const initial=pixels(type,step,0,0,true),end=pixels(type,step,1,0,true),later=pixels(type,step,1,1450,true);
   const delta=changed(initial,end),still=changed(end,later);
   if(still!==0)throw new Error('Reduced motion changes by time: '+type+step);
   // Washing, bottle reach, clothing, curtain, dimming and blanket must show state changes.
   if(['feed0','feed1','fresh0','fresh1','fresh2','play1','sleep0','sleep2'].includes(type+step)&&delta<80)throw new Error('Care progress does not enact '+type+step);
   const moving=changed(pixels(type,step,.55,400,false),pixels(type,step,.55,850,false));
   if(moving<30)throw new Error('Care animation is static '+type+step);
   stages.push({type,step,changedPixels:delta,animatedPixels:moving});
  }
  return {poses,stages};
 });
 // Close-up poses across all roles and the common combinations where arms used to overlap.
 await page.evaluate(()=>{
  const canvas=document.querySelector('canvas');canvas.width=1600;canvas.height=1200;const c=canvas.getContext('2d');
  c.fillStyle='#f5eef9';c.fillRect(0,0,1600,1200);
  const states=[{facing:'se'},{facing:'sw',pregnant:true},{facing:'ne'},{facing:'nw',holdingBaby:true},{facing:'se',holdingBaby:true,action:'feed'},{facing:'se',action:'wash'},{facing:'se',action:'music'},{facing:'se',action:'play'}];
  ['rumi','mira','zoey'].forEach((role,r)=>states.forEach((state,i)=>{
   const x=i*200,y=r*400;c.fillStyle=(r+i)%2?'#ede6f5':'#f8f2fb';c.fillRect(x+4,y+4,192,392);c.fillStyle='#67517b';c.font='17px sans-serif';c.fillText(role+' '+(state.action||state.facing),x+15,y+28);
   Art.drawCharacter(c,{x:x+99,y:y+350,scale:2.65,role,time:1234,walk:.23,actionProgress:.5,...state});
  }));
 });
 await page.screenshot({path:'/tmp/sternenbaby-art-v11-characters.png'});
 await page.setViewportSize({width:1800,height:2040});
 await page.evaluate(()=>{
  const canvas=document.querySelector('canvas');canvas.width=1800;canvas.height=2040;const c=canvas.getContext('2d');
  ['feed','fresh','play','sleep'].forEach((type,r)=>{for(let step=0;step<3;step++){
   const index=r*3+step,x=(index%2)*900,y=Math.floor(index/2)*340;
   Art.drawCareScene(c,{x,y,width:900,height:340,type,step,progress:.6,time:1250,role:r%2?'mira':'rumi',stage:0,active:true});
   c.fillStyle='#5b3e76';c.font='18px sans-serif';c.fillText(type+' · '+step,x+30,y+326);
  }});
 });
 await page.screenshot({path:'/tmp/sternenbaby-art-v11-care.png'});
 assert.deepEqual(errors,[]);await browser.close();
 fs.writeFileSync(path.join(root,'verification','art-v11.json'),JSON.stringify({passed:true,...result,visualSheets:['/tmp/sternenbaby-art-v11-characters.png','/tmp/sternenbaby-art-v11-care.png']},null,2));
 console.log('Art v1.1 passed: '+result.poses+' two-arm poses; 12 animated care stages, reduced motion stable.');
})().catch(e=>{console.error(e);process.exit(1)});
