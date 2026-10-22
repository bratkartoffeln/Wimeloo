'use strict';
/* Cross-module 1.1 flows. Dedicated suites cover all minigame and care mechanics. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const url = pathToFileURL(path.join(root, 'www/index.html')).href;
const fixture = {version:1,started:true,mother:'mira',selected:'mira',babyName:'Luna',story:3,chapter:0,visited:[],memories:['welcome'],outfit:0,wall:0,melody:[60,64,67,64],care:{feed:0,fresh:0,play:0,sleep:0},games:{sorting:0,counting:0,music:0},babyStage:0,lastCare:'none',settings:{sound:true,music:true,difficulty:1,sessionMinutes:0,reduceMotion:false},positions:{rumi:{x:8,y:7},mira:{x:9,y:5},zoey:{x:5,y:8}},createdAt:1700000000000};
const creations={
  sorting:{type:'outfit',items:[{type:'suit',color:'#a89bdc',pattern:'star'},{type:'hat',color:'#80b9b0',pattern:'stripe'},{type:'bib',color:'#e8bb69',pattern:'dots'},{type:'sock',color:'#cb98b5',pattern:'star'}]},
  counting:{type:'picnic',guests:5},music:{type:'melody',notes:[60,62,64,67,69,67,64],tempo:100},
  shapes:{type:'garden',flowers:['circle','triangle','square','rectangle','hexagon']},
  memory:{type:'memory',pictures:['sun','cloud','flower','star','moon','heart']},
  patterns:{type:'pattern',symbols:['sun','moon','moon','sun','moon','moon','sun','moon','moon']}
};
(async()=>{
  const browser = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  page.setDefaultTimeout(7000);
  const errors=[], results=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.addInitScript(seed=>{
    if(!sessionStorage.getItem('release-v11-seeded')) {localStorage.setItem('sternenbaby.state.v1',JSON.stringify(seed));sessionStorage.setItem('release-v11-seeded','yes');}
    window.releaseEvents={exported:[],imports:0,speech:[],intervals:[]};
    window.AndroidBridge={speak:text=>{releaseEvents.speech.push({text,volume:1});return true;},speakAtVolume:(text,volume)=>{releaseEvents.speech.push({text,volume});return true;},stopSpeaking:()=>{},exportSave:json=>{releaseEvents.exported.push(json);window.dispatchEvent(new Event('nativepause'));},importSave:()=>{releaseEvents.imports++;window.dispatchEvent(new Event('nativepause'));}};
    const interval=window.setInterval.bind(window);
    window.setInterval=(fn,ms,...args)=>{releaseEvents.intervals.push({fn,ms});return interval(fn,ms,...args);};
  },fixture);
  const done=(name,details={})=>{results.push({name,...details});console.log('PASS',name,JSON.stringify(details));};
  try {
    await page.goto(url);await page.waitForFunction(()=>window.Sternenbaby);
    assert.equal(await page.evaluate(()=>GameState.data.version),2);
    assert.equal(await page.evaluate(()=>GameState.data.babyName),'Luna');
    assert.deepEqual(await page.evaluate(()=>GameState.data.creations),{});

    // Every story entry, transition and final free-play screen is reachable with completed activities.
    await page.evaluate(()=>{
      for(const id of GameState.gameIds)GameState.data.games[id]=3;
      for(const id of Object.keys(GameState.data.care))GameState.data.care[id]=4;
      GameState.data.visited=['park','decorate','concert','album'];
      GameState.data.memories=['welcome'];GameState.data.chapter=0;Sternenbaby.showChapter();
    });
    for(let i=0;i<12;i++){
      assert.equal(await page.locator('.chapter-trail span').count(),12);
      assert.match(await page.locator('#overlay .eyebrow').textContent(),new RegExp('KAPITEL '+(i+1)+' VON 12'));
      await page.getByRole('button',{name:'Diesen Moment feiern',exact:true}).click();
      assert.equal(await page.evaluate(()=>Sternenbaby.overlayMode),'celebration');
      assert.equal(await page.evaluate(i=>GameState.data.memories.includes('chapter'+i),i),true);
      assert.equal(await page.evaluate(()=>GameState.data.chapter),Math.min(11,i+1));
      await page.getByRole('button',{name:'Zurück nach Hause',exact:true}).click();
      await page.evaluate(()=>Sternenbaby.showChapter());
    }
    assert.equal(await page.getByRole('button',{name:'Diesen Moment feiern',exact:true}).count(),0);
    assert.equal(await page.getByRole('button',{name:'Frei weiterspielen',exact:true}).count(),1);
    done('all-12-chapters-and-final-free-play');

    // Completion should count each activity once, and the last minigame must award a daily star.
    await page.evaluate(()=>{
      for(const id of GameState.gameIds){GameState.data.games[id]=0;GameState.data.mastery[id]={completed:0,assisted:0,bestDifficulty:0,lastDifficulty:1};}
      for(const id of Object.keys(GameState.data.care))GameState.data.care[id]=0;
      GameState.data.dailyPlan={date:GameState.localDate(),tasks:['care:feed','game:shapes','visit:decorate'],completed:[]};
      GameState.data.visitHistory=[];
      const open=Minigames.open.bind(Minigames);
      Minigames.open=(type,options)=>{window.releaseGameOptions=options;const session=open(type,options);window.releaseGameSession=session;return session;};
      Sternenbaby.showDaily();
    });
    assert.equal(await page.locator('[data-daily]').count(),3);
    assert.equal(await page.evaluate(()=>GameState.data.visitHistory.length),0);
    await page.locator('[data-daily="care:feed"]').click();
    // One real care flow is enough here: hand washing, bringing the bottle and cuddling.
    // The separate care suite covers drag gestures, other recipes and scene animation.
    for(let i=0;i<4;i++)await page.locator('.care-action-orb').click();
    await page.locator('.care-next').click();
    await page.locator('[data-draggable="true"]').click();
    await page.locator('[data-dropzone="true"]').click();
    await page.locator('.care-next').click();
    for(let i=0;i<4;i++)await page.locator('.care-action-orb').click();
    await page.getByRole('button',{name:'Das war schön!',exact:true}).click();
    assert.equal(await page.evaluate(()=>GameState.data.care.feed),1);
    await page.evaluate(()=>Sternenbaby.showDaily());
    assert.equal(await page.locator('[data-daily="care:feed"]').getAttribute('class').then(c=>c.includes('done')),true);
    await page.locator('[data-daily="visit:decorate"]').click();
    assert.equal(await page.locator('[data-decoration="bunting"]').isEnabled(),true);
    assert.equal(await page.locator('[data-decoration="lanterns"]').isEnabled(),false);
    await page.locator('[data-decoration="bunting"]').click();
    assert.deepEqual(await page.evaluate(()=>GameState.data.decorations),['bunting']);
    await page.getByRole('button',{name:'So lassen wir es!',exact:true}).click();
    await page.evaluate(()=>Sternenbaby.showDaily());
    await page.locator('[data-daily="game:shapes"]').click();
    assert.equal(await page.evaluate(()=>Sternenbaby.activeGame),true);
    await page.evaluate(()=>releaseGameOptions.onComplete({gameId:'shapes',assisted:true,score:3,creation:{type:'garden',flowers:['circle','triangle']}}));
    const daily=await page.evaluate(()=>({count:GameState.data.games.shapes,completed:GameState.data.dailyPlan.completed.length,days:GameState.data.visitHistory.length,mastery:GameState.data.mastery.shapes,toast:document.getElementById('toast').textContent}));
    assert.equal(daily.count,1);assert.equal(daily.completed,3);assert.equal(daily.days,1);assert.equal(daily.mastery.assisted,1);
    assert.deepEqual(await page.evaluate(()=>{for(let i=0;i<3;i++)for(const task of GameState.data.dailyPlan.tasks)GameState.completeDailyTask(task);return{tasks:GameState.data.dailyPlan.completed.length,days:GameState.data.visitHistory.length,care:GameState.data.care.feed,games:GameState.data.games.shapes};}),{tasks:3,days:1,care:1,games:1});
    await page.evaluate(()=>Sternenbaby.showPassport());
    assert.equal(await page.locator('.passport-card').count(),6);
    assert.match(await page.locator('#overlay .small-note').textContent(),/1 Besuch mit drei entdeckten Tagesideen/);
    done('daily-care-creative-game-recording-and-passport',daily);

    await page.evaluate(()=>{GameState.recordGame('sorting',{},1);Sternenbaby.showDecorate();});
    assert.equal(await page.locator('[data-decoration="lanterns"]').isEnabled(),true);
    assert.equal(await page.locator('[data-decoration="rainbow"]').isEnabled(),false);
    await page.locator('[data-decoration="lanterns"]').click();
    await page.locator('[data-decoration="bunting"]').click();
    assert.deepEqual(await page.evaluate(()=>GameState.data.decorations),['lanterns']);
    await page.locator('.color-options').nth(0).getByRole('button',{name:'Garten',exact:true}).click();
    await page.locator('.color-options').nth(1).getByRole('button',{name:'Rosengold',exact:true}).click();
    assert.deepEqual(await page.evaluate(()=>({wall:GameState.data.wall,outfit:GameState.data.outfit})),{wall:1,outfit:2});
    await page.getByRole('button',{name:'So lassen wir es!',exact:true}).click();
    done('decoration-unlock-toggle-and-independent-colours');

    // Volume values are independent and persist; music preview remains stoppable.
    await page.evaluate(()=>Sternenbaby.showParents());
    assert.equal(await page.locator('[data-volume]').count(),3);
    for(const[key,value]of [['musicVolume','90'],['voiceVolume','40'],['effectsVolume','20']]) {
      await page.locator('[data-volume="'+key+'"]').evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},value);
    }
    const volumes=await page.evaluate(()=>{const s=GameState.data.settings;return{music:s.musicVolume,voice:s.voiceVolume,effects:s.effectsVolume};});
    assert.deepEqual(volumes,{music:.9,voice:.4,effects:.2});
    await page.locator('[data-volume="musicVolume"]').evaluate(input=>input.dispatchEvent(new Event('change',{bubbles:true})));
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(()=>GameAudio.playing),true);
    await page.evaluate(()=>{Sternenbaby.concert();});
    await page.getByRole('button',{name:'Musik abspielen',exact:true}).click();
    await page.waitForTimeout(100);
    await page.getByRole('button',{name:'Musik stoppen',exact:true}).click();
    assert.equal(await page.evaluate(()=>GameAudio.playing),false);
    done('independent-volume-controls-and-music-stop',volumes);

    // Actual live minigame remains intact when pausing and when Android backgrounds the Activity.
    await page.evaluate(()=>Sternenbaby.startGame('sorting'));
    await page.locator('[data-action="select-sort"]').first().click();
    const selected=await page.locator('[data-action="select-sort"][aria-pressed="true"]').getAttribute('data-id');
    assert.equal(await page.evaluate(()=>onAndroidBack()),true);
    assert.equal(await page.locator('.mg-game').evaluate(el=>el.inert),true);
    await page.waitForTimeout(300);
    await page.getByRole('button',{name:'Weiterspielen',exact:true}).click();
    assert.equal(await page.locator('.mg-game').evaluate(el=>el.inert),false);
    assert.equal(await page.locator('[data-action="select-sort"][aria-pressed="true"]').getAttribute('data-id'),selected);
    await page.evaluate(()=>window.dispatchEvent(new Event('nativepause')));
    assert.equal(await page.locator('.mg-game').evaluate(el=>el.inert),true);
    const pausedClock=await page.evaluate(()=>releaseGameSession.snapshot().clock);
    await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>releaseGameSession.snapshot().clock),pausedClock);
    const seconds=await page.evaluate(()=>Sternenbaby.sessionSeconds);
    await page.evaluate(()=>{for(let i=0;i<4;i++)releaseEvents.intervals.find(x=>x.ms===1000).fn();});
    assert.equal(await page.evaluate(()=>Sternenbaby.sessionSeconds),seconds);
    await page.evaluate(()=>window.dispatchEvent(new Event('nativeresume')));
    assert.equal(await page.locator('.mg-game').evaluate(el=>el.inert),false);
    assert.equal(await page.locator('[data-action="select-sort"][aria-pressed="true"]').getAttribute('data-id'),selected);
    await page.locator('.mg-game [data-action="close"]').click();
    assert.equal(await page.evaluate(()=>Sternenbaby.activeGame),false);
    done('pause-nativepause-resume-retains-minigame-selection');

    // Contract checks for all six minigame completion callbacks. Actual puzzle solving is
    // covered by minigames-v11.cjs; here we verify persistence, counters and the app gallery.
    const countsBefore=await page.evaluate(()=>({...GameState.data.games}));
    for(const[id,creation]of Object.entries(creations)){
      await page.evaluate(id=>Sternenbaby.startGame(id),id);
      assert.equal(await page.evaluate(()=>Sternenbaby.activeGame),true);
      await page.evaluate(({id,creation})=>releaseGameOptions.onComplete({gameId:id,assisted:false,score:3,difficulty:2,creation}),{id,creation});
      assert.equal(await page.evaluate(()=>Sternenbaby.activeGame),false);
      assert.equal(await page.evaluate(id=>GameState.data.games[id],id),countsBefore[id]+1);
    }
    assert.deepEqual(await page.evaluate(()=>GameState.data.creations),creations);
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem(GameState.key)).creations),creations);
    assert.deepEqual(await page.evaluate(()=>GameState.data.melody),creations.music.notes);
    await page.evaluate(()=>Sternenbaby.showAlbum());
    assert.equal(await page.locator('.creation-gallery .creation-card').count(),6);
    const titles=await page.evaluate(()=>Object.fromEntries(Minigames.catalog.map(g=>[g.id,g.title])));
    for(const id of Object.keys(creations)){
      await page.locator('.creation-gallery').getByRole('button',{name:titles[id],exact:true}).click();
      assert.equal(await page.evaluate(()=>Sternenbaby.overlayMode),'creation');
      assert.equal(await page.locator('.creation-large>svg').count(),1);
      assert((await page.locator('.creation-large svg').first().innerHTML()).length>300);
      if(id==='music'){
        await page.evaluate(()=>{const play=GameAudio.playMelody;window.galleryMusic=[];GameAudio.playMelody=(notes,options)=>{galleryMusic.push([...notes]);return play(notes,options);};});
        await page.getByRole('button',{name:'Dein Lied spielen',exact:true}).click();
        assert.deepEqual(await page.evaluate(()=>galleryMusic.at(-1)),creations.music.notes);
      }
      await page.getByRole('button',{name:'Zurück zum Album',exact:true}).click();
    }
    done('six-creation-completions-persist-and-render-in-gallery',{types:Object.values(creations).map(c=>c.type),galleryCards:6});

    // Storage Access Framework callbacks are reproduced in real browser event order.
    await page.evaluate(()=>Sternenbaby.showParents());
    await page.getByRole('button',{name:'Spielstand sichern',exact:true}).click();
    assert.equal(await page.evaluate(()=>releaseEvents.exported.length),1);
    assert.equal(await page.evaluate(()=>Sternenbaby.world.snapshot().paused),true);
    const exported=await page.evaluate(()=>JSON.parse(releaseEvents.exported[0]));
    assert.equal(exported.format,'sternenbaby-save');assert.equal(exported.state.babyName,'Luna');
    assert.equal(exported.appVersion,'1.1.0');assert.deepEqual(exported.state.creations,creations);
    await page.evaluate(()=>{window.dispatchEvent(new Event('nativeresume'));window.dispatchEvent(new CustomEvent('nativesaveexport',{detail:{ok:true}}));});
    assert.equal(await page.evaluate(()=>Sternenbaby.overlayMode),'parents');
    await page.getByRole('button',{name:'Spielstand laden',exact:true}).click();
    await page.evaluate(()=>{window.dispatchEvent(new Event('nativeresume'));window.dispatchEvent(new CustomEvent('nativesaveimport',{detail:{cancelled:true}}));});
    assert.equal(await page.evaluate(()=>Sternenbaby.overlayMode),'parents');
    assert.equal(await page.evaluate(()=>GameState.data.babyName),'Luna');
    const candidate=await page.evaluate(()=>{const copy=JSON.parse(GameState.exportSave());copy.state.babyName='Milo';copy.state.mother='zoey';copy.state.selected='zoey';copy.state.chapter=8;for(const role of GameState.roles)copy.state.positions[role]=GameWorld.nearest(12+(role==='zoey'?1:0),10);return JSON.stringify(copy);});
    await page.evaluate(json=>window.dispatchEvent(new CustomEvent('nativesaveimport',{detail:{json}})),candidate);
    assert.equal(await page.evaluate(()=>Sternenbaby.overlayMode),'import-review');
    assert.match(await page.locator('#overlay').textContent(),/Milo/);
    assert.equal(await page.evaluate(()=>GameState.data.babyName),'Luna');
    await page.getByRole('button',{name:'Abbrechen',exact:true}).click();
    assert.equal(await page.evaluate(()=>GameState.data.babyName),'Luna');
    await page.evaluate(()=>Sternenbaby.reviewImport('{"format":"other"}'));
    assert.equal(await page.evaluate(()=>Sternenbaby.overlayMode),'parents');
    done('native-export-import-preview-cancel-and-invalid-document');

    await page.evaluate(json=>Sternenbaby.reviewImport(json),candidate);
    await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Diesen Stand laden',exact:true}).click()]);
    await page.waitForFunction(()=>window.Sternenbaby);
    const imported=await page.evaluate(()=>({name:GameState.data.babyName,mother:GameState.data.mother,chapter:GameState.data.chapter,positions:GameState.data.positions,reference:GameState.data===Sternenbaby.world.state,backup:JSON.parse(localStorage.getItem(GameState.backupKey)).babyName,volumes:[GameState.data.settings.musicVolume,GameState.data.settings.voiceVolume,GameState.data.settings.effectsVolume],creations:GameState.data.creations,melody:GameState.data.melody}));
    assert.equal(imported.name,'Milo');assert.equal(imported.mother,'zoey');assert.equal(imported.chapter,8);assert.equal(imported.reference,true);assert.equal(imported.backup,'Luna');
    assert.deepEqual(imported.positions,JSON.parse(candidate).state.positions);
    assert.deepEqual(imported.volumes,[.9,.4,.2]);
    assert.deepEqual(imported.creations,creations);assert.deepEqual(imported.melody,creations.music.notes);
    done('import-confirmation-reload-reference-and-backup-preservation',imported);

    await page.evaluate(()=>Sternenbaby.showAlbum());assert.equal(await page.locator('.creation-gallery .creation-card').count(),6);
    const dirty=await page.evaluate(()=>{const envelope=JSON.parse(GameState.exportSave());envelope.state.creations.sorting.items.push({type:'suit',color:'" onload="alert(1)',pattern:'star'});envelope.state.creations.patterns.symbols.push('<script>bad</script>');envelope.state.creations.music.notes.push(999,'60');envelope.state.creations.unknown={type:'garden',flowers:['circle']};return JSON.stringify(envelope);});
    const cleaned=await page.evaluate(text=>{const result=GameState.inspectImport(text);return{ok:result.ok,creations:result.state?.creations,live:GameState.data.creations};},dirty);
    assert.equal(cleaned.ok,true);assert.deepEqual(cleaned.creations,creations);assert.deepEqual(cleaned.live,creations);
    assert.equal(await page.locator('.creation-gallery script,.creation-gallery [onload],.creation-gallery [onerror]').count(),0);
    done('import-preview-filters-invalid-creation-values-without-mutating-live-gallery');

    // Tablet-sized app panels must fit without horizontal overflow.
    for(const [width,height]of [[1280,800],[1024,600],[800,480]]) {
      await page.setViewportSize({width,height});
      for(const panel of ['showGames','showDaily','showParents','showDecorate','showPassport','showAlbum']) {
        await page.evaluate(panel=>Sternenbaby[panel](),panel);
        const layout=await page.evaluate(()=>{const p=document.querySelector('.panel'),r=p.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,content:p.scrollWidth,client:p.clientWidth};});
        assert.ok(layout.left>=-1&&layout.right<=layout.width+1,panel+' outside '+width+' viewport: '+JSON.stringify(layout));
        assert.ok(layout.content<=layout.client+2,panel+' horizontal overflow at '+width);
      }
    }
    done('six-panels-including-creation-gallery-fit-three-tablet-viewports');
    assert.deepEqual(errors,[]);
    const report={suite:'release-v11',passed:results.length,results,pageErrors:errors,minigameCompletionCoverage:'completion-contract callbacks; mechanics separately verified in minigame suite',careCoverage:'one real feed workflow; full care mechanics separately verified',androidDocumentPicker:'callbacks simulated in browser; real Android picker not exercised'};
    fs.writeFileSync(path.join(root,'verification/release-v11-report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({suite:report.suite,passed:report.passed,pageErrors:errors}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
