const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const projectRoot = path.resolve(__dirname, '..');
const URL = pathToFileURL(path.join(projectRoot, 'www', 'index.html')).href;
(async () => {
  const browser = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || undefined,headless:true,args:['--no-sandbox']});
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.reviewSpeech=[];window.reviewIntervals=[];
    window.AndroidBridge={speak:t=>{window.reviewSpeech.push(t);return true;},stopSpeaking:()=>{}};
    const actualInterval=window.setInterval.bind(window);
    window.setInterval=(fn,ms,...args)=>{window.reviewIntervals.push({fn,ms,args});return actualInterval(fn,ms,...args);};
  });
  await page.goto(URL);await page.waitForFunction(()=>window.Sternenbaby);
  assert.equal(await page.evaluate(()=>Sternenbaby.overlayMode),'welcome');
  assert.equal(await page.evaluate(()=>GameState.data.started),false);
  assert.equal(await page.evaluate(()=>onAndroidBack()),true);
  assert.equal(await page.evaluate(()=>Sternenbaby.overlayMode),'pause');
  await page.locator('#overlay').getByRole('button',{name:'Weiterspielen',exact:true}).click();
  const returnedWelcome=await page.evaluate(()=>{
    for(let i=0;i<3;i++)reviewIntervals.find(x=>x.ms===1000).fn();
    return {mode:Sternenbaby.overlayMode,started:GameState.data.started,paused:Sternenbaby.world.snapshot().paused,seconds:Sternenbaby.sessionSeconds,heroChoices:document.querySelectorAll('[data-choose]').length};
  });
  assert.deepEqual(returnedWelcome,{mode:'welcome',started:false,paused:true,seconds:0,heroChoices:3});
  console.log('welcome-back-pause-resume',returnedWelcome);
  if(process.argv.includes('--onboarding-only')){
    await page.locator('[data-choose="zoey"]').click();
    await page.getByRole('button',{name:'Los geht’s!',exact:true}).click();
    const continued=await page.evaluate(()=>{
      reviewIntervals.find(x=>x.ms===1000).fn();
      return {mode:Sternenbaby.overlayMode,started:GameState.data.started,mother:GameState.data.mother,seconds:Sternenbaby.sessionSeconds};
    });
    assert.deepEqual(continued,{mode:'story',started:true,mother:'zoey',seconds:1});
    assert.deepEqual(errors,[]);
    console.log('onboarding-continuation',continued);
    console.log('page-errors',errors);
    await browser.close();
    return;
  }
  await page.locator('[data-choose="zoey"]').click();
  await page.getByRole('button',{name:'Los geht’s!',exact:true}).click();
  await page.getByRole('button',{name:'Wir machen uns bereit',exact:true}).click();
  await page.getByRole('button',{name:'Weiter zur Geburt',exact:true}).click();
  await page.getByRole('button',{name:'Das Baby begrüßen',exact:true}).click();
  await page.getByRole('button',{name:'Luna',exact:true}).click();
  await page.getByRole('button',{name:'Ab nach Hause',exact:true}).click();
  console.log('birth',await page.evaluate(()=>({story:GameState.data.story,mother:GameState.data.mother,babyName:GameState.data.babyName,memories:GameState.data.memories,overlay:Sternenbaby.overlayMode})));
  for(const id of ['feed','fresh','play','sleep']){
    await page.evaluate(id=>Sternenbaby.care(id),id);
    for(let i=0;i<3;i++)await page.locator('.care-step.active').click();
    await page.locator('.care-step.done').first().click();
    await page.getByRole('button',{name:'Das war schön!',exact:true}).click();
  }
  console.log('care-once',await page.evaluate(()=>GameState.data.care));
  await page.evaluate(()=>Sternenbaby.showChapter());
  await page.getByRole('button',{name:'Diesen Moment feiern',exact:true}).click();
  await page.getByRole('button',{name:'Zurück nach Hause',exact:true}).click();
  console.log('chapter',await page.evaluate(()=>({chapter:GameState.data.chapter,memories:GameState.data.memories})));
  for(const game of ['sorting','counting','music']){
    await page.evaluate(type=>Sternenbaby.startGame(type),game);
    const layout=await page.evaluate(()=>{const h=document.getElementById('mini-host'),r=h.getBoundingClientRect();return {position:getComputedStyle(h).position,zIndex:getComputedStyle(h).zIndex,width:r.width,height:r.height,screen:[innerWidth,innerHeight],centre:document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('.mg-game')!=null};});
    console.log('mini-layout',game,layout);
    if(game==='sorting'){
      await page.locator('[data-action="select-sort"]').first().click();
      const selected=await page.locator('[data-action="select-sort"][aria-pressed="true"]').getAttribute('data-id');
      const back=await page.evaluate(()=>onAndroidBack());
      console.log('game-nativeback',back,await page.evaluate(()=>({overlay:Sternenbaby.overlayMode,active:Sternenbaby.activeGame,paused:Sternenbaby.world.snapshot().paused})));
      const secondBack=await page.evaluate(()=>onAndroidBack());
      await page.getByRole('button',{name:'Weiterspielen',exact:true}).click();
      console.log('game-resume',secondBack,selected===await page.locator('[data-action="select-sort"][aria-pressed="true"]').getAttribute('data-id'));
    }
    await page.evaluate(type=>{
      const click=s=>{const b=document.querySelector(s);if(!b)throw Error('Missing '+s);b.click();};
      for(let r=0;r<3;r++){
        if(type==='sorting'){
          let b;
          while((b=document.querySelector('[data-action="select-sort"]:not([disabled])'))){const id=b.dataset.id;b.click();click('[data-action="place-sort"][data-id="'+id+'"]');}
        }else if(type==='counting'){
          const n=document.querySelectorAll('.mg-person').length;click('[data-action="choose-count"][data-amount="'+n+'"]');click('[data-action="check-count"]');
        }else{
          click('[data-action="help"]');const names=[...document.querySelectorAll('.mg-target-strip .mg-sr-only')].map(n=>n.textContent);
          for(const name of names){[...document.querySelectorAll('[data-action="note"]')].find(n=>n.textContent.trim()===name).click();}
          click('[data-action="check-music"]');
        }
        click('[data-action="next"]');
      }
      if(type==='music'){click('[data-action="note"][data-note="69"]');click('[data-action="finish-music"]');}
      else click('[data-action="finish"]');
    },game);
  }
  console.log('integrated-completions',await page.evaluate(()=>({games:GameState.data.games,melody:GameState.data.melody,miniHidden:document.getElementById('mini-host').hidden,active:Sternenbaby.activeGame,worldPaused:Sternenbaby.world.snapshot().paused,memories:GameState.data.memories})));
  await page.evaluate(()=>{Sternenbaby.world.setPaused(true);GameState.save();});
  const persisted=await page.evaluate(()=>({story:GameState.data.story,chapter:GameState.data.chapter,babyStage:GameState.data.babyStage,care:GameState.data.care,games:GameState.data.games,babyName:GameState.data.babyName,memories:GameState.data.memories,melody:GameState.data.melody}));
  await page.addInitScript(()=>{const original=Date.now;Date.now=()=>original()+14*24*3600*1000;});
  await page.reload();await page.waitForFunction(()=>window.Sternenbaby);
  console.log('absence-keeps-progress',await page.evaluate(expected=>JSON.stringify(expected)===JSON.stringify({story:GameState.data.story,chapter:GameState.data.chapter,babyStage:GameState.data.babyStage,care:GameState.data.care,games:GameState.data.games,babyName:GameState.data.babyName,memories:GameState.data.memories,melody:GameState.data.melody}),persisted));
  await page.evaluate(()=>{GameState.data.settings.sessionMinutes=5;for(let i=0;i<300;i++)reviewIntervals.find(x=>x.ms===1000).fn();});
  console.log('timer-pause',await page.evaluate(()=>({mode:Sternenbaby.overlayMode,seconds:Sternenbaby.sessionSeconds,title:document.querySelector('#overlay h2').textContent})));
  await page.locator('#overlay').getByRole('button',{name:'Elternbereich',exact:true}).click();
  console.log('timer-gate-close-controls',await page.locator('#overlay .panel-header button').count());
  await page.evaluate(()=>Sternenbaby.showParents(true));
  await page.evaluate(()=>{for(let i=0;i<5;i++)reviewIntervals.find(x=>x.ms===1000).fn();});
  console.log('timer-parents-retained',await page.evaluate(()=>({mode:Sternenbaby.overlayMode,seconds:Sternenbaby.sessionSeconds})));
  await page.getByRole('button',{name:'Neue Spielzeit beginnen',exact:true}).click();
  console.log('timer-reset',await page.evaluate(()=>({mode:Sternenbaby.overlayMode,seconds:Sternenbaby.sessionSeconds,paused:Sternenbaby.world.snapshot().paused})));
  await page.evaluate(()=>{const w=Sternenbaby.world,a=w.actors[GameState.data.selected],p=GameWorld.nearest(a.x,a.y);a.x=p.x;a.y=p.y;a.path=[];w.go(p,{id:'piano',action:'music'});Sternenbaby.pause();});
  await page.waitForTimeout(220);
  console.log('pending-interaction-pause-race',await page.evaluate(()=>({mode:Sternenbaby.overlayMode,active:Sternenbaby.activeGame,paused:Sternenbaby.world.snapshot().paused})));
  // Persistence tampering is checked in an isolated VM: pagehide intentionally
  // saves live browser state and would overwrite a pre-reload tamper fixture.
  const fs=require('node:fs'),vm=require('node:vm');
  const stateCode=fs.readFileSync(path.join(projectRoot,'www','state.js'),'utf8');
  function loadState(seed){const data=new Map(Object.entries(seed||{}));const ctx={Date,Math,JSON,Number,Array,Set,Object,localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};ctx.globalThis=ctx;vm.runInNewContext(stateCode,ctx);return ctx.GameState;}
  const baseline=loadState().fresh();baseline.started=true;baseline.story=3;baseline.babyName='Luna';baseline.care.feed=3;
  const malformed={...baseline,story:999,chapter:999,babyStage:-7,mother:'<img onerror=x>',selected:'evil',babyName:'<b>unsafe</b>',melody:['NaN',100,64],positions:{rumi:{x:999,y:NaN}},settings:{sound:'yes',difficulty:99,sessionMinutes:-8}};
  const cleaned=loadState({'sternenbaby.state.v1':JSON.stringify(malformed)}).data;
  assert.equal(cleaned.chapter,11);assert.equal(cleaned.mother,'rumi');assert.equal(cleaned.babyName,'Sternchen');assert.equal(cleaned.settings.difficulty,1);assert.equal(cleaned.settings.sessionMinutes,15);assert.equal(cleaned.positions.rumi.x,8);assert.deepEqual([...cleaned.melody],[64]);
  const recovered=loadState({'sternenbaby.state.v1':'{invalid','sternenbaby.state.backup.v1':JSON.stringify(baseline)});
  assert.equal(recovered.data.babyName,'Luna');assert.equal(recovered.data.care.feed,3);assert.equal(recovered.storageWarning,true);
  const future=loadState({'sternenbaby.state.v1':JSON.stringify({...baseline,version:3}),'sternenbaby.state.backup.v1':JSON.stringify(baseline)});assert.equal(future.data.version,2);assert.equal(future.data.babyName,'Luna');
  console.log('state-validation', {sanitization:true,corruptPrimaryRecoveredFromBackup:true,unsupportedVersionUsesValidBackup:true});
  console.log('page-errors',errors);
  await browser.close();
  assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exit(1);});
