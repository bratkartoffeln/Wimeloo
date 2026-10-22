/* Signal-level regression: production bell versus the 0.1.0 sine and zero volume. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();await page.setContent('<html><body>Audio acceptance</body></html>');
 await page.addScriptTag({content:fs.readFileSync(path.resolve(__dirname,'../www/audio.js'),'utf8')});
 const result=await page.evaluate(async()=>{
  async function render(kind,volume){
   const ctx=new OfflineAudioContext(1,48000,48000),bus=ctx.createGain();bus.gain.value=volume;bus.connect(ctx.destination);
   if(kind==='old'){
    const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=440*Math.pow(2,(64-69)/12);gain.gain.setValueAtTime(0,0);gain.gain.linearRampToValueAtTime(.12,.018);gain.gain.exponentialRampToValueAtTime(.001,.6);osc.connect(gain);gain.connect(bus);osc.start(0);osc.stop(.62);
   }else GameAudio.renderTone(ctx,bus,64,0,.75,1,'music');
   const buffer=await ctx.startRendering(),data=buffer.getChannelData(0);let squared=0,peak=0;
   for(const n of data){squared+=n*n;peak=Math.max(peak,Math.abs(n));}
   return{rms:Math.sqrt(squared/data.length),peak};
  }
  const old=await render('old',1),current=await render('new',.75),muted=await render('new',0);
  return{old,current,muted,rmsIncreaseDb:20*Math.log10(current.rms/old.rms),peakIncreaseDb:20*Math.log10(current.peak/old.peak)};
 });
 assert.ok(result.rmsIncreaseDb>=8,'Music should be clearly louder at default volume');
 assert.ok(result.current.peak<.95,'Single-note signal should retain headroom');
 assert.equal(result.muted.rms,0);assert.equal(result.muted.peak,0);
 // This is a software signal measurement, not a measurement of tablet speaker SPL.
 fs.writeFileSync(path.resolve(__dirname,'../verification/audio-mix-v1.json'),JSON.stringify({...result,scope:'Offline software synthesizer; device speaker volume not measured'},null,2));
 console.log(JSON.stringify(result,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
