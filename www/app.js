/* Wimeloo 1.1.0 – offline game orchestration, story, care and creative play. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id),I=name=>Art.icon(name),S=()=>GameState.data;
 const ROLES={rumi:'Rumi',mira:'Mira',zoey:'Zoey'};
 const V={
  welcome:'Willkommen in unserer Sternenwelt! Welche Freundin bekommt ein Baby? Tippe auf eine Figur und dann auf Los geht’s.',
  walk:'Tippe auf den Boden. Deine ausgewählte Figur läuft dorthin. Tippe auf einen Gegenstand, um etwas mit uns zu machen.',
  back:'Schön, dass du wieder da bist! Das Baby ist gut versorgt. Was möchtest du mit uns machen?',
  story0:'Bei uns wächst ein Baby! Es wächst im Körper der Mutter. Wir freuen uns darauf und bereiten ein gemütliches Zuhause vor. In unserer Geschichte vergeht die Zeit schneller als in Wirklichkeit.',
  story1:'Wir bereiten alles vor. Du kannst Babysachen sortieren und das Zimmer gestalten. Die Freundinnen helfen mit. Wenn du möchtest, erzählen wir die Geschichte weiter.',
  story2:'Heute ist ein besonderer Tag. Die Hebamme hilft der Mutter, und die Freundinnen sind bei ihr. Sie kümmern sich um alles. Gleich lernen wir das Baby kennen.',
  born:'Willkommen, kleines Sternchen! Das Baby ist da. Mutter und Baby dürfen sich ausruhen. Wie soll unser Baby heißen?',
  babyHome:'Das Baby ist gut versorgt. Du darfst helfen, mit ihm spielen oder etwas anderes machen. Die Erwachsenen sind immer da.',
  careMenu:'Was möchtest du mit dem Baby machen? Du kannst beim Füttern helfen, es frisch machen, mit ihm spielen oder ein Schlaflied auswählen.',
  preCare:'Das Baby wächst noch im Bauch der Mutter. Möchtest du die Geschichte weitererzählen oder schon die Spielsachen entdecken?',
  games:"Was möchtest du spielen? Entdecke Babysachen, Mengen, Musik, Formen, Bildpaare und bunte Muster.",
  decorate:'Gestalte unser Zuhause. Welche Farbe gefällt dir? Du kannst alles immer wieder verändern.',
  album:'Hier sind unsere Erinnerungen. Tippe auf ein Bild, um dich an unser gemeinsames Abenteuer zu erinnern.',
  emptyAlbum:'Hier sammeln wir bald unsere Erinnerungen. Du kannst unsere Geschichte beginnen oder ein Spiel ausprobieren.',
  pause:'Alles ist gut. Die Erwachsenen bleiben beim Baby. Du kannst jetzt eine Pause machen. Beim nächsten Mal spielen wir weiter.',
  timer:'Unsere Spielzeit ist zu Ende. Wir kümmern uns um das Baby. Du kannst zufrieden eine Pause machen.',
  feed:'Wir helfen beim Füttern. Zuerst waschen wir die Hände. Die erwachsene Figur begleitet das Baby die ganze Zeit.',
  fresh:'Wir machen es gemütlich. Lege zuerst die Sachen bereit. Dann helfen wir beim Frischmachen und suchen Kleidung aus.',
  play:'Zeit zum Spielen! Wähle die Rassel, spiele Kuckuck und schenke dem Baby ein Lächeln.',
  sleep:'Es wird ruhig. Wir machen das Licht gemütlich, hören unser Lied und lassen das Baby ausruhen.',
  careDone:'Das war ein schöner gemeinsamer Moment. Das Baby ist gut versorgt. Du kannst jetzt etwas anderes spielen oder Pause machen.',
  hands:'Wir waschen die Hände.',milk:'Die erwachsene Figur gibt dem Baby Milch.',cuddle:'Zeit für Nähe und Kuscheln.',
  ready:'Wir legen die Sachen bereit.',clean:'Die erwachsene Figur hilft beim Frischmachen.',clothes:'Du hast gemütliche Kleidung ausgesucht.',
  rattle:'Hör mal, die Rassel klingt!',peekaboo:'Kuckuck! Da bist du ja!',smile:'Das Baby freut sich über euer Spiel.',
  light:'Das Licht wird gemütlich.',lullaby:'Hier ist unser Schlaflied.',rest:'Schlaf gut, kleines Sternchen. Wir bleiben bei dir.',
  park:'Willkommen im Garten! Finde drei Blumen für unseren Tisch. Tippe die Blumen an. Du kannst sie auch immer wieder neu anordnen.',
  parkDone:'Drei Blumen! Unser Gartenstrauß ist fertig. Wir nehmen ihn mit nach Hause.',
  gameDone:'Das hast du ausprobiert! Eure Erinnerung ist jetzt im Album. Du kannst etwas anderes entdecken oder einfach frei spielen.',
  newChapter:'Ein neues gemeinsames Abenteuer wartet auf euch. Tippe oben auf unsere Geschichte.',
  chapterDone:'Diese Erinnerung gehört jetzt zu euch. Ihr könnt das nächste Abenteuer beginnen oder frei weiterspielen.',
  grow:'Das Baby entdeckt etwas Neues. Diesen Moment erleben wir gemeinsam. Du entscheidest, wann die nächste Babyphase beginnt.',
  growDone:'Das Baby kann jetzt noch mehr mit euch entdecken. Eure bisherigen Lieblingsspiele bleiben da.',
  concert:'Willkommen zu unserem kleinen Sternenkonzert! Alle Freundinnen sind da. Euer eigenes Lied gehört dazu.',
  completed:'Euer Erinnerungsfest ist da! Ihr habt viel zusammen erlebt. Euer Zuhause bleibt offen. Ihr könnt weiter spielen, gestalten und neue Lieder erfinden.',
  helpChapter:'Die Freundinnen helfen bei den Vorbereitungen. Wir können die Geschichte gemeinsam weitererzählen.',
  selectedRumi:'Du spielst jetzt mit Rumi. Tippe auf einen Platz.',selectedMira:'Du spielst jetzt mit Mira. Tippe auf einen Platz.',selectedZoey:'Du spielst jetzt mit Zoey. Tippe auf einen Platz.',
  roomSaved:'So sieht euer Zuhause jetzt aus. Du kannst es jederzeit wieder verändern.',
  nameSternchen:'Hallo, Sternchen!',nameLuna:'Hallo, Luna!',nameMilo:'Hallo, Milo!',nameNala:'Hallo, Nala!',nameLio:'Hallo, Lio!',nameMaja:'Hallo, Maja!',
  notReady:'Dort ist ein Möbelstück. Ich gehe zu einem freien Platz daneben.',
  bornChoice:'Das Baby ist da. Wir sind alle für euch da.',
  listen:'Tippe auf den Lautsprecher, wenn du den Hinweis noch einmal hören möchtest.',
  flowersOne:'Eine Blume.',flowersTwo:'Zwei Blumen.',flowersThree:'Drei Blumen.',
  chapter0:'Wir lernen das Baby kennen. Helft beim Füttern und spielt zusammen. Die Erwachsenen übernehmen immer, wenn du etwas anderes machen möchtest.',
  chapter1:'Wir erfinden ein Schlaflied. Spiele in der Musikecke und lass das Baby danach gemütlich ausruhen.',
  chapter2:'Die Freundinnen kommen zu Besuch. Wir suchen passende Kleidung und bereiten ein Picknick vor.',
  chapter3:'Heute besuchen wir den Garten. Findet Blumen und sucht eine neue Farbe für euer Zuhause aus.',
  chapter4:'Das Baby wird neugierig. Spielt noch einmal zusammen und entdeckt eine neue Klangfolge.',
  chapter5:'Unser kleines Konzert! Gestaltet ein Lied und eine schöne Bühne. Jede Idee ist willkommen.',
  chapter6:'Wir machen uns bereit für das Erinnerungsfest. Sucht noch einmal Babysachen aus und deckt den Tisch.',
  chapter7:'Unsere Lieblingsmomente! Schaut ins Album, hört euer Lied und feiert gemeinsam. Danach könnt ihr immer weiterspielen.',
  daily:"Hier sind drei Ideen für heute. Du kannst sie ausprobieren oder etwas ganz anderes spielen. Morgen gibt es neue Ideen.",
  dailyDone:"Du hast alle drei Ideen ausprobiert. Euer Besuch bekommt einen Stern im Entdeckerpass. Jetzt könnt ihr frei weiterspielen.",
  passport:"In deinem Entdeckerpass siehst du, was du schon ausprobiert hast. Du darfst alle Spiele immer wieder spielen.",
  collection:"Beim Spielen entdeckt ihr neue Dinge für euer Zuhause. Suche aus, welche Dekoration dir gefällt.",
  unlocked:"Ihr habt eine neue Dekoration entdeckt! Schaut beim Gestalten nach.",
  chapter8:"Heute pflanzen wir unseren Formengarten. Suche zu jedem Samen das passende Beet und bringe einen Blumenstrauß nach Hause.",
  chapter9:"Wir suchen Bilder, die zusammengehören. Danach spielen wir Kuckuck mit dem Baby. Schaut ganz genau hin!",
  chapter10:"Heute entdecken wir Muster. Welche Bilder kommen immer wieder? Wir legen eine bunte Kette und erfinden ein neues Lied.",
  chapter11:"Unser großes Sternenfest! Gestaltet euer Zuhause, hört euer Lieblingslied und schaut eure Erinnerungen an. Eure Welt bleibt immer offen.",
  allGames:"Alle sechs Spiele sind für dich da. Du kannst selbst wählen, womit du beginnen möchtest.",
  chooseDecoration:"Wähle eine Dekoration. Tippe noch einmal darauf, wenn du sie wieder weglegen möchtest."
 };
 const CHAPTERS=[
  {title:"Hallo, kleines Sternchen",icon:"baby",voice:V.chapter0,memory:"chapter0",tasks:[["care.feed", 1, "Gemeinsam füttern", "feed"], ["care.play", 1, "Kuckuck spielen", "play"]]},
  {title:"Ein Lied für dich",icon:"music",voice:V.chapter1,memory:"chapter1",tasks:[["games.music", 1, "Ein Lied erfinden", "music"], ["care.sleep", 1, "Gemütlich ausruhen", "sleep"]]},
  {title:"Besuch von Freundinnen",icon:"heart",voice:V.chapter2,memory:"chapter2",tasks:[["games.sorting", 1, "Babysachen aussuchen", "sorting"], ["games.counting", 1, "Das Picknick vorbereiten", "counting"]]},
  {title:"Unser bunter Garten",icon:"sun",voice:V.chapter3,memory:"chapter3",tasks:[["visited.park", 1, "Blumen entdecken", "park"], ["visited.decorate", 1, "Das Zuhause gestalten", "decorate"]]},
  {title:"Kleine Entdecker",icon:"sparkles",voice:V.chapter4,memory:"chapter4",tasks:[["care.play", 2, "Zusammen spielen", "play"], ["games.music", 2, "Neue Klänge entdecken", "music"]]},
  {title:"Unser Sternenkonzert",icon:"music",voice:V.chapter5,memory:"chapter5",tasks:[["visited.concert", 1, "Unser Lied aufführen", "concert"], ["visited.decorate", 1, "Alles schön gestalten", "decorate"]]},
  {title:"Wir bereiten das Fest vor",icon:"star",voice:V.chapter6,memory:"chapter6",tasks:[["games.sorting", 2, "Ein Lieblingsoutfit finden", "sorting"], ["games.counting", 2, "Für alle den Tisch decken", "counting"]]},
  {title:"Unser Erinnerungsfest",icon:"heart",voice:V.chapter7,memory:"chapter7",tasks:[["visited.album", 1, "Unsere Erinnerungen ansehen", "album"], ["visited.concert", 1, "Zusammen Musik machen", "concert"]]},
  {title:"Der Formengarten",icon:"shapes",voice:V.chapter8,memory:"chapter8",tasks:[["games.shapes", 1, "Samen und Formen entdecken", "shapes"], ["visited.park", 1, "Blumen mitbringen", "park"]]},
  {title:"Was gehört zusammen?",icon:"memory",voice:V.chapter9,memory:"chapter9",tasks:[["games.memory", 1, "Bildpaare finden", "memory"], ["care.play", 3, "Mit dem Baby lachen", "play"]]},
  {title:"Unsere bunte Musterkette",icon:"patterns",voice:V.chapter10,memory:"chapter10",tasks:[["games.patterns", 1, "Ein Muster fortsetzen", "patterns"], ["games.music", 3, "Ein neues Lied erfinden", "music"]]},
  {title:"Das große Sternenfest",icon:"star",voice:V.chapter11,memory:"chapter11",tasks:[["games.shapes", 2, "Den Garten blühen lassen", "shapes"], ["games.memory", 2, "Lieblingsbilder entdecken", "memory"], ["games.patterns", 2, "Eine Festkette gestalten", "patterns"], ["visited.concert", 1, "Gemeinsam feiern", "concert"]]}
 ];
 const MEMORY={welcome:['Willkommen, kleines Sternchen','baby',V.bornChoice],sorting:['Unsere Sternenoutfits','shirt','Wir haben passende Babysachen gefunden.'],counting:['Ein Picknick für alle','food','Wir haben für jede Freundin einen Platz vorbereitet.'],music:['Unser eigenes Lied','music','Wir haben zusammen Musik gemacht.'],feed:['Zeit zum Kuscheln','heart',V.careDone],fresh:['Frisch und gemütlich','shirt',V.clothes],play:['Kuckuck, da bist du!','baby',V.peekaboo],sleep:['Unser Schlaflied','moon',V.rest],decorate:['Unser schönes Zuhause','palette',V.roomSaved],park:['Ein Strauß aus dem Garten','sun',V.parkDone],concert:['Das kleine Sternenkonzert','music',V.concert],grow1:['Ein neues Lächeln','baby',V.growDone],grow2:['Kleine Entdecker','sparkles',V.growDone]};
 Object.assign(MEMORY,{shapes:['Unser Formengarten','shapes','Dein Formengarten blüht.'],memory:['Unsere Bildpaare','memory','Du hast dir die Bilder gemerkt.'],patterns:['Unsere Musterkette','patterns','Du hast die Regel im Muster entdeckt.']});
 CHAPTERS.forEach(c=>MEMORY[c.memory]=[c.title,c.icon,c.voice]);
 const CARE={
  feed:{title:'Zeit zum Füttern',icon:'food',voice:V.feed,steps:[['hand','Hände waschen',V.hands],['food','Milch geben',V.milk],['heart','Kuscheln',V.cuddle]]},
  fresh:{title:'Frisch und gemütlich',icon:'shirt',voice:V.fresh,steps:[['bag','Sachen bereitlegen',V.ready],['sparkles','Frisch machen',V.clean],['shirt','Kleidung wählen',V.clothes]]},
  play:{title:'Zeit für ein Lächeln',icon:'baby',voice:V.play,steps:[['music','Rassel spielen',V.rattle],['hand','Kuckuck!',V.peekaboo],['heart','Zusammen lachen',V.smile]]},
  sleep:{title:'Unser ruhiger Moment',icon:'moon',voice:V.sleep,steps:[['moon','Licht dimmen',V.light],['music','Schlaflied hören',V.lullaby],['heart','Ausruhen',V.rest]]}
 };
 const GAMES = [
  {id:'sorting',icon:'shirt',title:'Sternenoutfits',sub:'Bilder vergleichen und zuordnen',object:'dresser',skill:'Genau hinschauen'},
  {id:'counting',icon:'food',title:'Picknickzeit',sub:'Zählen und Mengen verteilen',object:'table',skill:'Mengen verstehen'},
  {id:'music',icon:'music',title:'Klangwerkstatt',sub:'Hören, merken und komponieren',object:'piano',skill:'Klänge entdecken'},
  {id:'shapes',icon:'shapes',title:'Formengarten',sub:'Formen erkennen und Blumen pflanzen',object:'shape_garden',skill:'Formen vergleichen'},
  {id:'memory',icon:'memory',title:'Bildpaare',sub:'Aufdecken und wiederfinden',object:'memory_table',skill:'Bilder erinnern'},
  {id:'patterns',icon:'patterns',title:'Musterketten',sub:'Regeln erkennen und fortsetzen',object:'pattern_loom',skill:'Muster entdecken'}
 ];
 GAMES.forEach(g=>{const meta=Minigames.catalog.find(m=>m.id===g.id);if(meta){g.title=meta.title;g.skill=meta.skill;}});
 const DECORATIONS = [
  ['bunting','Sternengirlande','star',0],['lanterns','Zauberlaternen','sun',2],
  ['rainbow','Regenbogen','heart',4],['cushions','Kuschelkissen','baby',7],
  ['starMobile','Sternenmobile','moon',10],['flowerArch','Blumenbogen','shapes',14]
 ];
 const DAILY_LABELS={
  'care:feed':['Zusammen füttern','food','feed'],'care:fresh':['Frisch und gemütlich','shirt','fresh'],
  'care:play':['Kuckuck mit dem Baby','baby','play'],'care:sleep':['Ein ruhiger Moment','moon','sleep'],
  'visit:park':['Blumen für zu Hause','sun','park'],'visit:decorate':['Unser Zuhause gestalten','palette','decorate'],
  'visit:concert':['Ein kleines Konzert','music','concert'],'visit:album':['Erinnerungen anschauen','album','album']
 };
 GAMES.forEach(g=>DAILY_LABELS['game:'+g.id]=[g.title,g.icon,g.id]);
 globalThis.AppVoiceLines=[...new Set([...Object.values(V),...Object.values(MEMORY).map(m=>m[2]),...CarePlay.voiceLines])];
 let overlayMode='',activeGame=null,activeCare=null,audioContext=null,spoken=null,lastSpeech='',speechToken=0,toastTimer=0,sessionSeconds=0,inPause=false,sessionExpired=false,pauseWasGame=false,panelCleanup=null,melodyTimers=[],sceneStop=null,speechRestoreTimer=0,nativeHidden=false;
 const WORLD=new GameWorld.World($('world'),S(),{icon:I,onInteract:routeAction,onSelect:role=>{GameState.save();renderChrome();WORLD.react?.('wave');say(V['selected'+ROLES[role]]);},onSave:()=>GameState.save(),onMove:()=>{$('world-hint').style.opacity='.35';}});
 function normalized(s){return String(s).normalize('NFC').replace(/\s+/g,' ').trim();}
 function stopSpeech(){
  speechToken++;clearTimeout(speechRestoreTimer);GameAudio.duck(false);
  if(spoken){spoken.pause();spoken=null;}
  try{window.AndroidBridge?.stopSpeaking();}catch(_){}
  try{window.speechSynthesis?.cancel();}catch(_){}
 }
 function say(text){
  lastSpeech=text;if(!S().settings.sound||S().settings.voiceVolume===0||document.hidden||nativeHidden){stopSpeech();return;}
  stopSpeech();const token=speechToken,file=(window.VoicePack||{})[normalized(text)];
  GameAudio.duck(true);
  if(file){spoken=new Audio(file);spoken.volume=S().settings.voiceVolume??1;
   spoken.onended=()=>{if(token===speechToken){spoken=null;GameAudio.duck(false);}};
   spoken.play().catch(()=>fallbackSpeak(text,token));
  }else fallbackSpeak(text,token);
 }
 function fallbackSpeak(text,token){
  if(token!==speechToken||!S().settings.sound)return;
  speechRestoreTimer=setTimeout(()=>{if(token===speechToken)GameAudio.duck(false);},Math.min(35000,Math.max(2000,text.length*80)));
  try{if(window.AndroidBridge?.speakAtVolume){if(window.AndroidBridge.speakAtVolume(text,S().settings.voiceVolume??1))return;}else if(window.AndroidBridge?.speak(text))return;}catch(_){}
  if('speechSynthesis'in window){const u=new SpeechSynthesisUtterance(text);u.lang='de-DE';u.rate=1;u.pitch=1;u.volume=S().settings.voiceVolume??1;
   const german=speechSynthesis.getVoices().find(v=>v.lang.startsWith('de')&&v.localService);
   if(german)u.voice=german;else if(window.AndroidBridge){GameAudio.duck(false);return;}
   u.onend=u.onerror=()=>{if(token===speechToken)GameAudio.duck(false);};
   try{speechSynthesis.speak(u);}catch(_){GameAudio.duck(false);}
  }else GameAudio.duck(false);
 }
 function sound(note=60,length=.4,channel='effects'){
  if(inPause||document.hidden||nativeHidden)return;
  GameAudio.note(note,length,channel);
 }
 function stopMelody(){melodyTimers.forEach(clearTimeout);melodyTimers=[];GameAudio.stopMelody();}
 function melody(notes=S().melody,options={}){
  if(inPause||document.hidden||nativeHidden)return;
  stopMelody();return GameAudio.playMelody(notes,options);
 }
 function message(text,voice){$('message-text').textContent=text;if(voice)say(voice);}
 function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3300);}
 function button(label,fn,cls='primary',icon){const b=document.createElement('button');b.className=cls;b.setAttribute('aria-label',label||'Zurück');b.innerHTML=I(icon||(GameState.names.includes(label)?'sound':'arrow'))+'<span>'+label+'</span>';b.onclick=fn;return b;}
 function makePanel(title,options={}){
  if(panelCleanup){panelCleanup();panelCleanup=null;}if(sceneStop){sceneStop();sceneStop=null;}
  stopSpeech();stopMelody();overlayMode=options.mode||'panel';WORLD.setPaused(true);activeGame?.setPaused?.(true);
  const host=$('overlay');host.hidden=false;host.style.zIndex='40';
  host.innerHTML='<section class="panel '+(options.narrow?'narrow':'')+'" role="dialog" aria-modal="true"><div class="panel-header"><div><div class="eyebrow"></div><h2></h2></div></div><div class="panel-content"></div></section>';
  const panel=host.querySelector('.panel');panel.setAttribute('aria-label',title);panel.querySelector('h2').textContent=title;
  panel.querySelector('.eyebrow').textContent=options.eyebrow||'';
  if(options.close!==false){const close=button('',closeOverlay,'icon-btn','close');close.setAttribute('aria-label','Zurück zur Welt');panel.querySelector('.panel-header').appendChild(close);}
  return{panel,body:panel.querySelector('.panel-content')};
 }
 function closeOverlay(){
  if(inPause){resume();return;}
  if(panelCleanup){panelCleanup();panelCleanup=null;}if(sceneStop){sceneStop();sceneStop=null;}
  stopSpeech();stopMelody();$('overlay').hidden=true;$('overlay').replaceChildren();overlayMode='';
  activeGame?.setPaused?.(false);WORLD.setPaused(!!activeGame);renderChrome();WORLD.dirty=true;GameState.save();
 }
 function footer(body,...buttons){const f=document.createElement('div');f.className='panel-footer';buttons.forEach(b=>f.appendChild(b));body.appendChild(f);return f;}
 function paragraph(body,text,cls){const p=document.createElement('p');p.textContent=text;if(cls)p.className=cls;body.appendChild(p);return p;}
 function paintCanvas(canvas,draw){const w=canvas.clientWidth||300,h=canvas.clientHeight||200,d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;const c=canvas.getContext('2d');c.scale(d,d);draw(c,w,h);}
 function avatar(canvas,role,pregnant=false){paintCanvas(canvas,(c,w,h)=>{const scale=Math.min(w/82,h/118);Art.drawCharacter(c,{x:w/2,y:h-4,scale,role,facing:'se',pregnant,time:0});});}
 function scene(body,type,opts={}){
  const wrap=document.createElement('div');wrap.className=opts.care?'care-stage':'story-art';
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Eine gemeinsame Szene mit der Sternenfamilie');wrap.appendChild(canvas);body.appendChild(wrap);
  let frame=0,last=0,stopped=false;
  const draw=(now=performance.now())=>paintCanvas(canvas,(c,w,h)=>{
   const calm=S().settings.reduceMotion,t=calm?0:now,scale=Math.min(h/150,w/250),phase=(Math.sin(t/420)+1)/2;
   const base={time:t,reducedMotion:calm,facing:'se',actionProgress:phase};
   c.fillStyle='#d4b5dd40';c.beginPath();c.ellipse(w*.5,h*.86,w*.3,h*.08,0,0,Math.PI*2);c.fill();
   if(type==='intro'||type==='prepare'){
    Art.drawCharacter(c,{...base,x:w*.48,y:h*.91,scale:scale*1.1,role:S().mother,pregnant:true,action:'wave'});
    Art.drawObject(c,type==='prepare'?'suitcase':'plant',{x:w*.79,y:h*.91,scale:scale*.8,time:t});
   }else if(type==='birth'){
    Art.drawCharacter(c,{...base,x:w*.48,y:h*.91,scale:scale*1.12,role:S().mother,holdingBaby:true,action:'feed'});
    Art.drawObject(c,'gift',{x:w*.8,y:h*.9,scale:scale*.8,time:t});
   }else if(type==='sleep'){
    Art.drawObject(c,'crib',{x:w*.42,y:h*.91,scale:scale*.95,baby:true,sleeping:true,time:t,reducedMotion:calm});
    Art.drawCharacter(c,{...base,x:w*.77,y:h*.92,scale:scale*.85,role:S().mother,facing:'sw',action:'sleep'});
    if(opts.step>0){c.fillStyle='rgba(66,48,91,'+(opts.step*.055)+')';c.fillRect(0,0,w,h);}
   }else if(type==='concert'){
    Art.drawObject(c,'stage',{x:w*.53,y:h*.95,scale:scale*.86,time:t,active:true});
    ['mira','rumi','zoey'].forEach((role,i)=>Art.drawCharacter(c,{...base,x:w*(.25+i*.25),y:h*.77,scale:scale*.7,role,action:'music',actionProgress:(phase+i*.17)%1}));
    for(let i=0;i<7;i++){c.fillStyle=['#c395d7','#efbd60','#8dc6bc'][i%3];c.font=(17+scale*2)+'px serif';c.fillText(i%2?'♪':'♫',w*(.12+i*.12),h*(.18+.1*Math.sin(t/600+i)));}
   }else{
    const action=opts.careId==='fresh'?'wash':opts.careId||'play';
    Art.drawCharacter(c,{...base,x:w*.4,y:h*.92,scale:scale*1.02,role:S().mother,holdingBaby:action==='feed',action:opts.step?action:'wave'});
    if(action!=='feed'){
     Art.drawObject(c,'baby_mat',{x:w*.7,y:h*.85,scale:scale*.8,baby:false,time:t});
     Art.drawBaby(c,w*.7,h*.63,scale*1.25,false,['#c1b2df','#9acbc4','#ecc38b','#e4a6b8'][S().outfit],{time:t,stage:S().babyStage,reaction:action,reducedMotion:calm});
    }
    if(opts.step&&action==='wash')for(let i=0;i<7;i++){const px=w*(.56+(i%4)*.075),py=h*(.62-(t/1800+i*.16)%1*.32);c.beginPath();c.arc(px,py,3+(i%3)*2,0,Math.PI*2);c.strokeStyle='#80bdca99';c.lineWidth=2;c.stroke();}
    if(opts.step&&action==='play'){
     c.save();c.translate(w*.74,h*.31);c.rotate(calm?0:Math.sin(t/110)*.24);c.strokeStyle='#a58ac4';c.lineWidth=7*scale;c.beginPath();c.moveTo(-5*scale,12*scale);c.lineTo(5*scale,-6*scale);c.stroke();c.fillStyle='#e7a5b7';c.beginPath();c.arc(8*scale,-12*scale,12*scale,0,Math.PI*2);c.fill();c.restore();
    }
   }
   if(opts.step>=3||type==='birth')for(let i=0;i<5;i++){const x=w*(.16+i*.16),y=h*(.19+.04*Math.sin(t/700+i));c.fillStyle=['#d7aedf','#f4cb78','#a4cec0'][i%3];c.font='19px serif';c.fillText('♥',x,y);}
  });
  function tick(now){if(stopped||!canvas.isConnected)return;if(!document.hidden&&!nativeHidden&&now-last>50){draw(now);last=now;}if(!S().settings.reduceMotion)frame=requestAnimationFrame(tick);}
  const render=()=>draw(performance.now());
  frame=requestAnimationFrame(now=>{render();if(!S().settings.reduceMotion)tick(now);});
  const previous=sceneStop;sceneStop=()=>{stopped=true;cancelAnimationFrame(frame);previous?.();};
  return{canvas,render};
 }
 function renderChrome(){const state=S();$('brand-icon').innerHTML=I('star');$('chapter-icon').innerHTML=I(state.story>=3?CHAPTERS[state.chapter].icon:'heart');$('chapter-label').textContent=state.story>=3?CHAPTERS[state.chapter].title:['Ein kleines Wunder','Wir machen uns bereit','Willkommen, Baby'][state.story];$('sound-button').innerHTML=I(state.settings.sound?'sound':'mute');$('parent-button').innerHTML=I('settings');$('hint-icon').innerHTML=I('hand');$('repeat-button').innerHTML=I('sound');document.querySelector('.message-icon').innerHTML=I('sparkles');for(const [id,icon]of [['home','home'],['care','baby'],['games','play'],['album','album'],['pause','pause']])$(id+'-button').querySelector('span').innerHTML=I(icon);
   const nav=$('characters');nav.replaceChildren();for(const role of GameState.roles){const b=document.createElement('button');b.className='character-button'+(state.selected===role?' selected':'');b.dataset.role=role;b.setAttribute('aria-label','Mit '+ROLES[role]+' spielen');b.setAttribute('aria-pressed',String(state.selected===role));const cv=document.createElement('canvas');b.append(cv,document.createTextNode(ROLES[role]));b.onclick=()=>{if(!overlayMode&&!activeGame)WORLD.select(role);};nav.appendChild(b);avatar(cv,role);}
   WORLD.reduced=state.settings.reduceMotion;document.documentElement.classList.toggle('reduced-motion',state.settings.reduceMotion);WORLD.dirty=true;updateDailyButton();
 }
 function welcome(){const{body}=makePanel('Eure kleine Sternenwelt',{mode:'welcome',close:false,eyebrow:'MUSIK · FREUNDSCHAFT · EIN BABY'});paragraph(body,'Welche Freundin bekommt ein Baby? Ihr begleitet sie gemeinsam in eurer eigenen Geschichte.');const grid=document.createElement('div');grid.className='hero-grid';body.appendChild(grid);let chosen=S().mother;for(const role of GameState.roles){const b=document.createElement('button');b.className='hero-choice'+(role===chosen?' active':'');b.dataset.choose=role;const cv=document.createElement('canvas');b.append(cv,document.createTextNode(ROLES[role]));b.onclick=()=>{chosen=role;grid.querySelectorAll('button').forEach(v=>v.classList.toggle('active',v===b));sound(64);};grid.appendChild(b);requestAnimationFrame(()=>avatar(cv,role,true));}footer(body,button('Los geht’s!',()=>{S().mother=chosen;S().selected=chosen;S().started=true;GameState.save();renderChrome();showStory();},'primary','arrow'));paragraph(body,'Alle Anweisungen werden vorgelesen. Die Erwachsenen kümmern sich auch während einer Pause um das Baby.','small-note');say(V.welcome);}
 function showStory(){if(S().story>=3){showChapter();return;}const stage=S().story;const titles=['Bei uns wächst ein Baby','Wir machen uns bereit','Ein besonderer Tag'];const voices=[V.story0,V.story1,V.story2];const{body}=makePanel(titles[stage],{mode:'story',eyebrow:'UNSERE GESCHICHTE'});const layout=document.createElement('div');layout.className='story-layout';body.appendChild(layout);scene(layout,stage===0?'intro':'prepare');const copy=document.createElement('div');copy.className='story-copy';layout.appendChild(copy);const dots=document.createElement('div');dots.className='step-dots';dots.innerHTML=[0,1,2].map(i=>'<i class="'+(i===stage?'active':'')+'"></i>').join('');copy.appendChild(dots);paragraph(copy,voices[stage]);
   if(stage===0)footer(copy,button('Wir machen uns bereit',()=>{S().story=1;GameState.save();showStory();},'primary','arrow'),button('Erst die Welt entdecken',()=>{closeOverlay();message(V.walk,V.walk);},'secondary','home'));
   if(stage===1)footer(copy,button('Weiter zur Geburt',()=>{S().story=2;GameState.save();showStory();},'primary','heart'),button('Sachen sortieren',()=>{closeOverlay();WORLD.goToObject('dresser');},'secondary','shirt'));
   if(stage===2)footer(copy,button('Das Baby begrüßen',()=>{GameState.birth();renderChrome();showNaming();},'primary','baby'));say(voices[stage]);}
 function showNaming(){const{body}=makePanel('Hallo, kleines Sternchen!',{mode:'birth',close:false,eyebrow:'DAS BABY IST DA'});const layout=document.createElement('div');layout.className='story-layout';body.appendChild(layout);scene(layout,'birth');const copy=document.createElement('div');copy.className='story-copy';layout.appendChild(copy);paragraph(copy,'Mutter und Baby dürfen sich ausruhen. Alle helfen mit. Wie soll euer Baby heißen?');const names=document.createElement('div');names.className='name-choices';for(const n of GameState.names){const b=button(n,()=>{S().babyName=n;names.querySelectorAll('button').forEach(v=>v.classList.toggle('active',v===b));say(V['name'+n]);},n===S().babyName?'active':'');names.appendChild(b);}copy.appendChild(names);footer(copy,button('Ab nach Hause',()=>{GameState.save();closeOverlay();message(V.babyHome,V.babyHome);},'primary','home'));say(V.born);}
 function taskDone(t){const[k,n]=t;if(k.startsWith('visited.'))return S().visited.includes(k.slice(8));const[a,b]=k.split('.');return(S()[a]?.[b]||0)>=n;}
 function chapterReady(){return CHAPTERS[S().chapter].tasks.every(taskDone)||S().visited.includes('assisted:'+S().chapter);}
 function showChapter(){
  const ch=CHAPTERS[S().chapter],already=S().memories.includes(ch.memory);
  const{body}=makePanel(ch.title,{mode:'chapter',eyebrow:'UNSER ABENTEUER · KAPITEL '+(S().chapter+1)+' VON '+CHAPTERS.length});
  const trail=document.createElement('div');trail.className='chapter-trail';
  CHAPTERS.forEach((c,i)=>{const dot=document.createElement('span');dot.className=(S().memories.includes(c.memory)?'done ':'')+(S().chapter===i?'current':'');dot.textContent=String(i+1);trail.appendChild(dot);});body.appendChild(trail);
  paragraph(body,ch.voice);const tasks=document.createElement('div');tasks.className='chapter-tasks';
  ch.tasks.forEach(t=>tasks.appendChild(button(t[2],()=>{closeOverlay();routeAction(t[3]);},'chapter-task'+(taskDone(t)?' done':''),actionIcon(t[3]))));body.appendChild(tasks);
  if(already&&S().chapter===CHAPTERS.length-1){paragraph(body,'Eure große Sternengeschichte bleibt im Album. Jeden Tag warten neue Spielideen auf euch. Alle Orte, Spiele und Dekorationen bleiben da.');footer(body,button('Unsere Tagesideen',showDaily,'primary','sun'),button('Frei weiterspielen',closeOverlay,'secondary','home'));}
  else if(chapterReady())footer(body,button('Diesen Moment feiern',finishChapter,'primary','heart'));
  else footer(body,button('In die Welt',closeOverlay,'primary','home'),button('Die Freundinnen helfen',()=>{GameState.visit('assisted:'+S().chapter);showChapter();say(V.helpChapter);},'secondary','heart'));
  say(ch.voice);
 }
 function finishChapter(){
  const n=S().chapter,ch=CHAPTERS[n],last=n===CHAPTERS.length-1;
  GameState.memory(ch.memory);if(!last)S().chapter++;GameState.save();
  const{body}=makePanel(last?'Das große Sternenfest':ch.title,{mode:'celebration',eyebrow:'EIN MOMENT FÜR UNSER ALBUM'});
  scene(body,n>=5?'concert':'birth',{care:true});paragraph(body,last?V.completed:'Diese gemeinsame Erinnerung bleibt in eurem Album. Ihr könnt jetzt das nächste Abenteuer entdecken oder frei spielen.');
  footer(body,button('Zurück nach Hause',()=>{closeOverlay();WORLD.celebrate?.();},'primary','home'),button('Erinnerungen ansehen',showAlbum,'secondary','album'));
  if(n===3||n===8)footer(body,button('Eine neue Babyphase?',showGrowth,'secondary','baby'));
  say(last?V.completed:V.chapterDone);sound(67);renderChrome();
 }
 function showGrowth(){const{body}=makePanel('Das Baby entdeckt Neues',{mode:'growth',narrow:true});paragraph(body,'Ihr entscheidet gemeinsam, welche Babyphase ihr spielen möchtet. Das Baby wächst nie während eurer Abwesenheit. Alle bisherigen Lieblingsspiele bleiben erhalten.');const options=[['Neugeboren','Schauen, kuscheln und erste Klänge.'],['Ein neues Lächeln','Das Baby freut sich über eure Spiele.'],['Kleine Entdecker','Neue Geschichten und neugierige Reaktionen.']];const grid=document.createElement('div');grid.className='chapter-tasks';options.forEach(([title,sub],i)=>{const b=button(title+(S().babyStage===i?' · gerade aktiv':''),()=>{S().babyStage=i;if(i)GameState.memory('grow'+i);GameState.save();closeOverlay();message(sub,V.growDone);},'chapter-task'+(S().babyStage===i?' done':''),'baby');grid.appendChild(b);});body.appendChild(grid);say(V.grow);}
 function showCare(){if(S().story<3){const{body}=makePanel('Das Baby wächst noch',{mode:'care-before',narrow:true});paragraph(body,'Bald lernen wir das Baby kennen. Du kannst die Geschichte weitererzählen oder schon spielen.');footer(body,button('Geschichte weitererzählen',showStory,'primary','heart'),button('Spiele entdecken',showGames,'secondary','play'));say(V.preCare);return;}
   const{body}=makePanel('Ein schöner Moment mit '+S().babyName,{mode:'care'});paragraph(body,'Was möchtest du gemeinsam machen? Alle Erwachsenen helfen mit.');const grid=document.createElement('div');grid.className='card-grid care-grid';for(const [id,c]of Object.entries(CARE)){const b=document.createElement('button');b.className='activity-card';b.dataset.care=id;b.innerHTML=I({feed:'bottle',fresh:'nappy',play:'rattle',sleep:'bed'}[id])+'<strong>'+({feed:'Füttern',fresh:'Frisch machen',play:'Spielen',sleep:'Ausruhen'}[id])+'</strong>';b.onclick=()=>care(id);grid.appendChild(b);}body.appendChild(grid);footer(body,button('Etwas anderes spielen',showGames,'secondary','play'));say(V.careMenu);}
 function care(id){
  if(S().story<3){showCare();return;}const data=CARE[id];if(!data)return;
  const{body}=makePanel(data.title,{mode:'care-action',eyebrow:'ZUSAMMEN MACHEN · SCHRITT FÜR SCHRITT'});
  let recorded=false;
  activeCare=CarePlay.open(body,{id,role:S().mother,stage:S().babyStage,outfit:S().outfit,reducedMotion:S().settings.reduceMotion,steps:data.steps,speak:say,sound:n=>sound(n,.45),melody:()=>melody(),onComplete:result=>{
    if(recorded)return;recorded=true;if(id==='fresh')S().outfit=result.outfit;
    S().care[id]++;S().lastCare=id;GameState.memory(id);completeDaily('care:'+id);GameState.save();WORLD.react?.(id==='fresh'?'wash':id);
    const f=footer(body,button('Das war schön!',()=>{closeOverlay();message(V.careDone,V.careDone);if(chapterReady())toast('Eine neue Erinnerung wartet in eurer Geschichte.');},'primary','heart'));f.dataset.careFinish='true';WORLD.dirty=true;
  }});
  const activity=activeCare;panelCleanup=()=>{activity.destroy();if(activeCare===activity)activeCare=null;};
 }
 function actionIcon(id){return({feed:'bottle',fresh:'nappy',play:'rattle',sleep:'bed',park:'garden',decorate:'palette',concert:'microphone',album:'album'}[id])||GAMES.find(g=>g.id===id)?.icon||'star';}
 function animateGameCards(grid){
  let stopped=false,frame=0,last=0,elapsed=0;
  function render(now){
   if(stopped||!grid.isConnected)return;
   if(!document.hidden&&!nativeHidden&&now-last>70){
    const dt=last?Math.min(100,now-last):0;elapsed+=dt;last=now;const t=S().settings.reduceMotion?0:elapsed;
    grid.querySelectorAll('canvas').forEach((canvas,index)=>paintCanvas(canvas,(c,w,h)=>{
     const type=GAMES[index].id,scale=Math.min(w/245,h/110),role=['rumi','mira','zoey'][index%3];
     c.save();c.translate(w/2,h*.88);c.scale(scale,scale);
     c.fillStyle='#8c6fa121';c.beginPath();c.ellipse(0,1,91,12,0,0,Math.PI*2);c.fill();
     if(type==='sorting'){
      Art.drawObject(c,'dresser',{x:-45,y:4,scale:.78,time:t});
      Art.drawCharacter(c,{x:43,y:5,scale:.72,role,time:t,action:'wave',pregnant:S().story<3,reducedMotion:S().settings.reduceMotion});
      Art.drawProp(c,'shirt',-48,-33,.85,Math.sin(t/900)*.05,'#dd8be0');
     }else if(type==='counting'){
      Art.drawObject(c,'table',{x:0,y:2,scale:.92,time:t});
      for(let j=0;j<3;j++){c.fillStyle=['#9b83d2','#f2b361','#7dbdb2'][j];Art.roundRect(c,-30+j*25,-41+(j%2)*7,15,18,4,c.fillStyle);c.fillStyle='#fff9';c.fillRect(-27+j*25,-38+(j%2)*7,9,3);}
     }else if(type==='music'){
      Art.drawObject(c,'piano',{x:-42,y:2,scale:.82,time:t,active:true});
      Art.drawCharacter(c,{x:45,y:4,scale:.8,role,time:t,action:'music',actionProgress:(Math.sin(t/300)+1)/2,reducedMotion:S().settings.reduceMotion});
     }else{
      Art.drawObject(c,{shapes:'shape_garden',memory:'memory_table',patterns:'bead_stand'}[type],{x:0,y:4,scale:1.13,time:t,active:true});
     }
     c.restore();
    }));
   }
   if(!S().settings.reduceMotion)frame=requestAnimationFrame(render);
  }
  frame=requestAnimationFrame(render);const previous=panelCleanup;panelCleanup=()=>{stopped=true;cancelAnimationFrame(frame);previous?.();};
 }
 function showGames(){
  const{body}=makePanel('Was spielen wir heute?',{mode:'games',eyebrow:'SECHS SPIELE · IMMER NEUE IDEEN'});
  const grid=document.createElement('div');grid.className='card-grid game-selection';
  GAMES.forEach(g=>{const b=document.createElement('button');b.className='activity-card';b.dataset.game=g.id;
   b.innerHTML='<canvas class="game-card-art" aria-hidden="true"></canvas><strong>'+g.title+'</strong><small>'+g.sub+'</small><span class="game-stamps" aria-hidden="true">'+(S().games[g.id]?'★'.repeat(Math.min(3,S().mastery[g.id].bestDifficulty||1)):'✦ ✦ ✦')+'</span>';b.setAttribute('aria-label',g.title);
   b.onclick=()=>{closeOverlay();const object=GameWorld.objects.find(o=>o.action===g.id);if(object)WORLD.goToObject(object.id);else startGame(g.id);};grid.appendChild(b);
  });body.appendChild(grid);animateGameCards(grid);
  footer(body,button('Unsere Tagesideen',showDaily,'secondary','sun'),button('Entdeckerpass',showPassport,'secondary','star'),button('Zuhause gestalten',showDecorate,'secondary','palette'));
  say(V.games);
 }
 function startGame(type){
  if(!GAMES.some(g=>g.id===type))return;
  if(activeGame)finishGameClose();closeOverlay();WORLD.setPaused(true);$('mini-host').hidden=false;overlayMode='';
  const difficulty=S().settings.difficulty;
  activeGame=Minigames.open(type,{container:$('mini-host'),difficulty,reducedMotion:S().settings.reduceMotion,
   speak:t=>{if(!inPause)say(t);},sound:n=>{if(type==='music'){stopSpeech();sound(n,.65,'music');}else sound(n);},
   onClose:finishGameClose,onComplete:result=>{
    const oldTotal=gameTotal();GameState.recordGame(result.gameId,result,difficulty);
    if(result.creation?.notes?.length)S().melody=result.creation.notes.slice(0,16);
    if(result.creation)GameState.recordCreation?.(result.gameId,result.creation);
    GameState.memory(result.gameId);completeDaily('game:'+result.gameId);GameState.save();
    finishGameClose();WORLD.celebrate?.();message(V.gameDone,V.gameDone);
    const unlocked=DECORATIONS.find(d=>d[3]>oldTotal&&d[3]<=gameTotal());
    if(unlocked)toast('Neu zum Gestalten: '+unlocked[1]);else if(chapterReady())toast('In eurer Geschichte wartet ein gemeinsamer Moment.');
   }});
 }
 function finishGameClose(){
  if(activeGame){activeGame.destroy?.();activeGame=null;}$('mini-host').hidden=true;
  stopSpeech();stopMelody();GameAudio.stopAll();WORLD.setPaused(inPause||nativeHidden);renderChrome();GameState.save();
 }
 function showDecorate(){
  const{body}=makePanel('So gefällt es uns!',{mode:'decorate',eyebrow:'EURE FARBEN · EURE LIEBLINGSSTÜCKE'});
  paragraph(body,'Welche Farben gefallen euch heute? Wähle eure Wände und die Babydecke.');
  const colors=[['Lavendel','#d8c8ec'],['Garten','#d0dfd3'],['Rosengold','#e9d0d0'],['Sonnenschein','#e2d8c3']];
  for(const [key,label]of [['wall','Wandfarbe'],['outfit','Babydecke']]){
   const heading=document.createElement('h3');heading.textContent=label;body.appendChild(heading);
   const options=document.createElement('div');options.className='color-options';
   colors.forEach(([name,color],i)=>{const b=document.createElement('button');b.className=S()[key]===i?'active':'';b.setAttribute('aria-pressed',String(S()[key]===i));b.innerHTML='<i style="background:'+color+'"></i>'+name;
    b.onclick=()=>{S()[key]=i;options.querySelectorAll('button').forEach(e=>{e.classList.toggle('active',e===b);e.setAttribute('aria-pressed',String(e===b));});WORLD.dirty=true;GameState.save();sound(60+i*2);};options.appendChild(b);});body.appendChild(options);
  }
  const heading=document.createElement('h3');heading.textContent='Unsere Dekorationen';body.appendChild(heading);paragraph(body,'Beim Spielen kommen neue Lieblingsstücke dazu. Alle bleiben in eurer Sammlung.','small-note');
  const grid=document.createElement('div');grid.className='decor-grid';const total=gameTotal();
  DECORATIONS.forEach(([id,name,icon,needed])=>{
   const unlocked=total>=needed,active=S().decorations.includes(id);const b=button(name,()=>{
    if(!unlocked)return;const at=S().decorations.indexOf(id);if(at>=0)S().decorations.splice(at,1);else S().decorations.push(id);
    b.classList.toggle('selected',S().decorations.includes(id));b.setAttribute('aria-pressed',String(S().decorations.includes(id)));GameState.save();WORLD.dirty=true;sound(67);
   },'decor-card'+(active?' selected':'')+(unlocked?'':' locked'),icon);
   b.dataset.decoration=id;b.disabled=!unlocked;b.setAttribute('aria-pressed',String(active));
   const small=document.createElement('small');small.textContent=unlocked?'Antippen zum Aufstellen':('Noch '+(needed-total)+' Spielrunden');b.appendChild(small);grid.appendChild(b);
  });body.appendChild(grid);
  footer(body,button('So lassen wir es!',()=>{GameState.visit('decorate');GameState.memory('decorate');completeDaily('visit:decorate');closeOverlay();message(V.roomSaved,V.roomSaved);},'primary','check'));
  say(V.collection);
 }
 function showPark(){const{body}=makePanel('Ein Strauß für zu Hause',{mode:'park',eyebrow:'UNSER KLEINER GARTEN'});paragraph(body,'Pflücke drei Blumen für euren Tisch. Du kannst dir aussuchen, welche dir gefallen.');const garden=document.createElement('div');garden.className='flower-game';garden.style.cssText='display:flex;justify-content:center;gap:15px;flex-wrap:wrap;background:#e5efe1;border-radius:24px;padding:25px';let picked=0;const status=paragraph(body,'Noch drei Blumen.');const palette=['#d68ba5','#aa8acb','#edbd71','#e9a18a','#8bbda4'];for(let i=0;i<5;i++){const b=document.createElement('button');b.style.cssText='width:80px;height:100px;border-radius:24px;background:#fffaf4;display:grid;place-items:center';b.setAttribute('aria-label','Blume '+(i+1)+' pflücken');b.innerHTML='<svg width="63" height="77" viewBox="0 0 63 77"><path d="M32 68V32M32 54Q13 45 17 55Q21 64 32 61" stroke="#73a88a" fill="#86b899" stroke-width="4"/>'+Array.from({length:6},(_,j)=>'<ellipse cx="32" cy="19" rx="8" ry="13" fill="'+palette[i]+'" transform="rotate('+j*60+' 32 31)"/>').join('')+'<circle cx="32" cy="31" r="8" fill="#f9d98a"/></svg>';b.onclick=()=>{if(b.disabled||picked>=3)return;b.disabled=true;picked++;b.style.opacity='.35';status.textContent=picked+' von 3 Blumen.';sound(60+picked*2);say([V.flowersOne,V.flowersTwo,V.flowersThree][picked-1]);if(picked===3){GameState.visit('park');GameState.memory('park');completeDaily('visit:park');footer(body,button('Unseren Strauß mitnehmen',()=>{closeOverlay();message(V.parkDone,V.parkDone);},'primary','home'));}};garden.appendChild(b);}body.insertBefore(garden,status);say(V.park);}
 function showAlbum(){
  GameState.visit('album');completeDaily('visit:album');const{body}=makePanel('Unser Erinnerungsalbum',{mode:'album',eyebrow:'DEINE WERKE · EURE GEMEINSAMEN MOMENTE'});
  const works=Object.entries(S().creations||{}).filter(([,c])=>c&&Minigames.creationArt);
  if(works.length){const heading=document.createElement('h3');heading.textContent='Deine letzten eigenen Werke';body.appendChild(heading);const gallery=document.createElement('div');gallery.className='creation-gallery';
   works.forEach(([id,creation])=>{const b=document.createElement('button');b.className='creation-card';b.setAttribute('aria-label',GAMES.find(g=>g.id===id)?.title||'Eigenes Werk');b.innerHTML=Minigames.creationArt(creation)+'<span>'+I(id==='music'?'music':'focus')+'</span>';b.onclick=()=>showCreation(id);gallery.appendChild(b);});body.appendChild(gallery);
  }
  const entries=S().memories.filter(id=>MEMORY[id]);if(!entries.length&&!works.length){const empty=document.createElement('div');empty.className='empty-state';empty.innerHTML=I('album');body.appendChild(empty);paragraph(empty,'Hier ist Platz für eure gemeinsamen Erinnerungen.');footer(body,button('Unsere Geschichte',showStory,'primary','heart'));say(V.emptyAlbum);return;}
  const grid=document.createElement('div');grid.className='album-grid';
  for(const id of entries){const [label,icon,voice]=MEMORY[id];const b=document.createElement('button');b.className='memory-card';b.setAttribute('aria-label',label);b.innerHTML='<div class="memory-illustration">'+I(icon)+'</div><span>'+label+'</span>';b.onclick=()=>{say(voice);if(id==='music')setTimeout(()=>{if(overlayMode==='album')melody();},1700);};grid.appendChild(b);}body.appendChild(grid);
  footer(body,button('Unser Lied hören',()=>{stopSpeech();melody();},'secondary','music'),button('Zurück zur Welt',closeOverlay,'primary','home'));say(V.album);
 }
 function showCreation(id){
  const creation=S().creations?.[id],game=GAMES.find(g=>g.id===id);if(!creation||!game){showAlbum();return;}
  const{body}=makePanel(game.title,{mode:'creation',eyebrow:'DAS HAST DU GESTALTET'});const art=document.createElement('div');art.className='creation-large';art.innerHTML=Minigames.creationArt(creation);body.appendChild(art);
  footer(body,button('Noch einmal gestalten',()=>startGame(id),'primary','play'),button('Zurück zum Album',showAlbum,'secondary','album'));
  if(id==='music')footer(body,button('Dein Lied spielen',()=>{stopSpeech();melody(creation.notes,{loops:2});},'primary','music'));say(MEMORY[id]?.[2]||V.album);
 }
 function concert(){
  GameState.visit('concert');GameState.memory('concert');completeDaily('visit:concert');
  const{body}=makePanel('Unser kleines Sternenkonzert',{mode:'concert',eyebrow:'DIE BÜHNE GEHÖRT EUCH'});scene(body,'concert',{care:true});
  paragraph(body,'Euer Lied, drei Freundinnen und eure eigene Bühne. Spielt es mit Glockenklang und warmer Begleitung.');
  const strip=document.createElement('div');strip.className='concert-notes';
  S().melody.forEach((n,i)=>{const dot=document.createElement('i');dot.style.background=['#bc96d3','#eab66d','#8fc4b7','#df9cab','#9bb7d4'][[60,62,64,67,69].indexOf(n)];dot.textContent='♪';strip.appendChild(dot);});body.appendChild(strip);
  const play=button('Musik abspielen',()=>{stopSpeech();WORLD.react?.('music');play.querySelector('span').textContent='Noch einmal spielen';melody(S().melody,{loops:3,onNote:i=>[...strip.children].forEach((d,j)=>d.classList.toggle('playing',i===j)),onEnd:()=>[...strip.children].forEach(d=>d.classList.remove('playing'))});},'primary','music');
  footer(body,play,button('Musik stoppen',()=>{stopMelody();GameAudio.stopAll();[...strip.children].forEach(d=>d.classList.remove('playing'));},'secondary','pause'),button('Ein neues Lied erfinden',()=>startGame('music'),'secondary','sparkles'),button('Nach Hause',closeOverlay,'secondary','home'));
  say(V.concert);
 }
 function routeAction(action){
  if(action==='care')showCare();else if(GAMES.some(g=>g.id===action))startGame(action);
  else if(CARE[action])care(action);else if(action==='story')showStory();else if(action==='decorate')showDecorate();
  else if(action==='park')showPark();else if(action==='album')showAlbum();else if(action==='concert')concert();else if(action==='daily')showDaily();
 }
 function pause(timed=false){
  if(inPause)return;sessionExpired=sessionExpired||timed;inPause=true;pauseWasGame=!!activeGame;
  activeGame?.setPaused?.(true);stopSpeech();stopMelody();GameAudio.stopAll();WORLD.setPaused(true);GameState.save();
  const{body}=makePanel(timed?'Zeit für eine Pause':'Alles ist gut versorgt',{mode:'pause',narrow:true,close:false});
  const art=document.createElement('div');art.className='pause-art';art.innerHTML=I('moon');body.appendChild(art);
  paragraph(body,'Die Erwachsenen bleiben beim Baby. Du kannst das Tablet jetzt weglegen. Euer Zuhause und alle Erinnerungen bleiben erhalten.');
  footer(body,...(timed?[button('Elternbereich',()=>parentGate(true),'secondary','settings')]:[button('Weiterspielen',resume,'primary','play')]));
  paragraph(body,'Die App darf jederzeit geschlossen werden.','small-note');say(timed?V.timer:V.pause);
 }
 function resume(){
  if(!S().started){inPause=false;welcome();return;}
  if(sessionExpired){inPause=false;pause(true);return;}
  if(panelCleanup){panelCleanup();panelCleanup=null;}if(sceneStop){sceneStop();sceneStop=null;}
  stopSpeech();stopMelody();$('overlay').hidden=true;$('overlay').replaceChildren();overlayMode='';inPause=false;
  activeGame?.setPaused?.(false);WORLD.setPaused(!!activeGame);if(!activeGame)message(V.babyHome);renderChrome();
 }
 function parentGate(fromTimer=false){const wasPaused=inPause;const{body}=makePanel('Für Erwachsene',{mode:'parent-gate',narrow:true,close:!fromTimer});paragraph(body,'Bitte die Taste drei Sekunden lang gedrückt halten.');const hold=document.createElement('button');hold.className='parent-gate';hold.innerHTML='<i class="hold-progress"></i><span>Gedrückt halten</span>';const progress=hold.querySelector('i');body.appendChild(hold);let timer=0,start=0,raf=0;function cancel(){clearTimeout(timer);cancelAnimationFrame(raf);progress.style.transform='scaleX(0)';}function frame(){progress.style.transform='scaleX('+Math.min(1,(performance.now()-start)/3000)+')';raf=requestAnimationFrame(frame);}hold.addEventListener('pointerdown',e=>{e.preventDefault();hold.setPointerCapture(e.pointerId);start=performance.now();frame();timer=setTimeout(()=>{cancel();showParents(fromTimer);},3000);});['pointerup','pointercancel','pointerleave'].forEach(ev=>hold.addEventListener(ev,cancel));panelCleanup=cancel;}
 function showParents(fromTimer=false){
  const{body}=makePanel('Elternbereich',{mode:'parents',eyebrow:'STERNENBABY · VERSION 1.1.0'});inPause=sessionExpired;
  const setRow=(label,control)=>{const row=document.createElement('label');row.className='setting-row';row.append(document.createTextNode(label),control);body.appendChild(row);};
  for(const[key,label]of [['sound','Ton eingeschaltet'],['reduceMotion','Ruhige Bewegungen']]){
   const cb=document.createElement('input');cb.type='checkbox';cb.checked=S().settings[key];cb.onchange=()=>{S().settings[key]=cb.checked;GameState.save();if(key==='sound'&&!cb.checked){stopSpeech();GameAudio.stopAll();}GameAudio.update();renderChrome();};setRow(label,cb);
  }
  for(const[key,label]of [['musicVolume','Musik'],['voiceVolume','Sprachausgabe'],['effectsVolume','Spieleffekte']]){
   const wrap=document.createElement('div');wrap.className='volume-control';const range=document.createElement('input');range.type='range';range.min='0';range.max='100';range.step='5';range.value=String(Math.round((S().settings[key]??.75)*100));range.dataset.volume=key;
   range.setAttribute('aria-label',label+' Lautstärke');const value=document.createElement('output');value.textContent=range.value+' %';
   range.oninput=()=>{S().settings[key]=Number(range.value)/100;value.textContent=range.value+' %';if(spoken)spoken.volume=S().settings.voiceVolume;GameAudio.update();GameState.save();};
   range.onchange=()=>{if(key==='musicVolume'){stopSpeech();melody([60,64,67],{loops:1});}else if(key==='effectsVolume')sound(67);else say(V.listen);};wrap.append(range,value);setRow(label,wrap);
  }
  const diff=document.createElement('select');[[1,'Entdecken · einfache Aufgaben'],[2,'Ausprobieren · etwas mehr'],[3,'Knobeln · größere Mengen']].forEach(([v,l])=>diff.add(new Option(l,String(v),false,S().settings.difficulty===v)));diff.onchange=()=>{S().settings.difficulty=Number(diff.value);GameState.save();};setRow('Schwierigkeit der Lernspiele',diff);
  const length=document.createElement('select');[[5,'5 Minuten'],[10,'10 Minuten'],[15,'15 Minuten'],[20,'20 Minuten'],[30,'30 Minuten'],[0,'Ohne Zeitgrenze']].forEach(([v,l])=>length.add(new Option(l,String(v),false,S().settings.sessionMinutes===v)));length.onchange=()=>{S().settings.sessionMinutes=Number(length.value);GameState.save();};setRow('Spielbesuch begrenzen',length);
  paragraph(body,'Lernangebote: Merkmale vergleichen, Mengen zuordnen, Klangfolgen und Bilder merken, Formen erkennen und Muster fortsetzen. Drei frei wählbare Stufen. Hilfen kosten keine Belohnungen.','parent-help');
  const actions=document.createElement('div');actions.className='parent-actions';
  actions.append(button('Neue Spielzeit beginnen',()=>{sessionSeconds=0;sessionExpired=false;inPause=false;closeOverlay();},'primary','play'),button('Babyphase wählen',showGrowth,'secondary','baby'),button('Lernfortschritt ansehen',showPassport,'secondary','star'));
  if(S().story<3)actions.append(button('Direkt beim Baby starten',()=>{GameState.birth();renderChrome();showNaming();},'secondary','baby'));
  actions.append(button('Spielstand sichern',exportSave,'secondary','album'),button('Spielstand laden',chooseImport,'secondary','bag'),button('Spiel neu beginnen',confirmReset,'secondary danger','repeat'));body.appendChild(actions);
  paragraph(body,'Sichern erstellt eine Datei auf deinem Gerät. Beim Laden wird zuerst eine Vorschau angezeigt. Speichere vor Deinstallation oder Gerätewechsel eine Sicherung.','small-note');
  paragraph(body,'Vollständig offline: keine Werbung, Käufe, Konten, Analyse-Dienste oder Netzwerkberechtigung. Pflege bleibt jederzeit frei zugänglich. Es gibt keine Nachteile durch Pausen und keine versäumten Anmeldeserien. Deutsche Ansagen aus WevoLabs sind eingebaut.','small-note');
 }
 function gameTotal(){return Object.values(S().games).reduce((a,b)=>a+b,0);}
 function completeDaily(id){
  const before=S().dailyPlan?.completed?.length||0;GameState.completeDailyTask(id);
  const p=S().dailyPlan;if(before<3&&p.completed.length===3){toast('Drei schöne Ideen entdeckt · ein Stern für euren Besuch!');}
  updateDailyButton();
 }
 function updateDailyButton(){
  const p=GameState.ensureDailyPlan();const b=$('daily-button');if(!b)return;
  b.innerHTML=I('sun')+'<span>Heute entdecken <span class="daily-stars" aria-hidden="true">'+p.tasks.map((_,i)=>'<i class="'+(i<p.completed.length?'filled':'')+'">★</i>').join('')+'</span></span>';
  b.setAttribute('aria-label','Tagesideen öffnen, '+p.completed.length+' von '+p.tasks.length+' ausprobiert');
 }
 function showDaily(){
  const p=GameState.ensureDailyPlan();const{body}=makePanel('Unsere Ideen für heute',{mode:'daily',eyebrow:'EIN NEUER TAG · DEIN EIGENES TEMPO'});
  paragraph(body,'Drei kleine Vorschläge für euren Besuch. Ihr könnt sie jederzeit überspringen und frei spielen.');
  const cards=document.createElement('div');cards.className='daily-cards';
  p.tasks.forEach((id,i)=>{const [title,icon,action]=DAILY_LABELS[id]||['Etwas entdecken','star','games'];const done=p.completed.includes(id);
   const b=button(title,()=>{closeOverlay();routeAction(action);},'daily-card'+(done?' done':''),icon);b.dataset.daily=id;
   const small=document.createElement('small');small.textContent=done?'Heute schon gemeinsam erlebt':['Ein Moment zusammen','Etwas Neues lernen','Eine eigene Idee'][i];b.appendChild(small);cards.appendChild(b);
  });body.appendChild(cards);
  paragraph(body,p.completed.length===3?'Euer heutiger Besuch bekommt einen Stern. Alle Spiele bleiben für euch offen.':'Morgen kommen andere Ideen. Euer Fortschritt und eure Erinnerungen bleiben immer da.','small-note');
  footer(body,button('Entdeckerpass',showPassport,'secondary','star'),button('Frei spielen',showGames,'primary','play'));
  say(p.completed.length===3?V.dailyDone:V.daily);
 }
 function showPassport(){
  const{body}=makePanel('Mein Entdeckerpass',{mode:'passport',eyebrow:'JEDER VERSUCH GEHÖRT DAZU'});
  paragraph(body,'Deine gemeinsamen Erlebnisse bleiben hier. Die Sterne zeigen die bisher höchste abgeschlossene Stufe. Hilfe ist immer willkommen.');
  const grid=document.createElement('div');grid.className='passport-grid';
  GAMES.forEach(g=>{const m=S().mastery[g.id],card=document.createElement('button');card.className='passport-card';card.innerHTML=I(g.icon)+'<strong>'+g.title+'</strong><div class="passport-stars" aria-label="Höchste abgeschlossene Stufe '+m.bestDifficulty+'">'+[1,2,3].map(n=>'<span class="'+(n<=m.bestDifficulty?'earned':'')+'">★</span>').join('')+'</div><small>'+S().games[g.id]+' gemeinsame Spielrunden</small><small>'+g.skill+'</small>';card.onclick=()=>startGame(g.id);grid.appendChild(card);});body.appendChild(grid);
  const days=S().visitHistory.length;paragraph(body,days+' Besuch'+(days===1?'':'e')+' mit drei entdeckten Tagesideen · '+gameTotal()+' gespielte Runden · '+S().memories.length+' Erinnerungen','small-note');
  footer(body,button('Erinnerungsalbum',showAlbum,'secondary','album'),button('Unsere Tagesideen',showDaily,'secondary','sun'),button('Zurück zur Welt',closeOverlay,'primary','home'));say(V.passport);
 }
 function exportSave(){
  GameState.save();const json=GameState.exportSave();
  try{if(window.AndroidBridge?.exportSave){window.AndroidBridge.exportSave(json);return;}}
  catch(_){toast('Die Sicherung konnte nicht geöffnet werden. Bitte erneut versuchen.');return;}
  const link=document.createElement('a'),url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
  link.href=url;link.download='Wimeloo-Spielstand.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Die Spielstandsicherung wurde zum Speichern bereitgestellt.');
 }
 function chooseImport(){
  try{if(window.AndroidBridge?.importSave){window.AndroidBridge.importSave();return;}}
  catch(_){toast('Die Dateiauswahl konnte nicht geöffnet werden.');return;}
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
  input.onchange=async()=>{const f=input.files?.[0];if(!f)return;if(f.size>1048576){toast('Diese Datei ist zu groß für eine Spielstandsicherung.');return;}try{reviewImport(await f.text());}catch(_){toast('Diese Datei konnte nicht gelesen werden.');}};input.click();
 }
 function reviewImport(json){
  const checked=GameState.inspectImport(json);if(!checked.ok){toast(checked.error||'Diese Datei ist kein gültiger Wimeloo-Spielstand.');return;}
  const data=checked.state;const{body}=makePanel('Diesen Spielstand laden?',{mode:'import-review',narrow:true});
  paragraph(body,'Baby: '+data.babyName+' · Begleiterin: '+ROLES[data.mother]);
  paragraph(body,'Kapitel '+(data.chapter+1)+' · '+data.memories.length+' Erinnerungen · '+Object.values(data.games).reduce((a,b)=>a+b,0)+' Spielrunden');
  paragraph(body,'Beim Laden wird der aktuelle Spielstand durch diese Sicherung ersetzt. Du kannst deinen jetzigen Stand vorher noch sichern.');
  footer(body,button('Aktuellen Stand sichern',exportSave,'secondary','album'),button('Abbrechen',()=>showParents(),'secondary','close'),button('Diesen Stand laden',()=>{const result=GameState.importSave(json);if(result.ok)location.reload();else toast(result.error);},'primary','check'));
 }
 function confirmReset(){const{body}=makePanel('Neuen Spielstand beginnen?',{mode:'reset',narrow:true});paragraph(body,'Dadurch werden das aktuelle Baby, die Zimmergestaltung und das Erinnerungsalbum gelöscht. Zum Bestätigen bitte NEUSTART eingeben.');const input=document.createElement('input');input.className='reset-input';input.autocomplete='off';input.autocapitalize='characters';input.setAttribute('aria-label','NEUSTART zum Zurücksetzen eingeben');body.appendChild(input);const reset=button('Alles zurücksetzen',()=>{if(input.value!=='NEUSTART')return;finishGameClose();GameState.reset();location.reload();},'secondary danger','repeat');reset.disabled=true;input.oninput=()=>reset.disabled=input.value!=='NEUSTART';footer(body,button('Behalten',showParents,'primary','heart'),reset);}
 function init(){
  renderChrome();$('zoom-in').innerHTML=I('zoomin');$('zoom-out').innerHTML=I('zoomout');$('zoom-reset').innerHTML=I('focus');
  $('zoom-in').onclick=()=>WORLD.zoomBy?.(1.3);$('zoom-out').onclick=()=>WORLD.zoomBy?.(1/1.3);$('zoom-reset').onclick=()=>WORLD.resetCamera();
  $('chapter-button').onclick=showStory;$('daily-button').onclick=showDaily;
  $('home-button').onclick=()=>{WORLD.resetCamera();if(overlayMode)closeOverlay();message(V.walk,V.walk);};
  $('care-button').onclick=()=>WORLD.goToObject('crib');$('games-button').onclick=showGames;$('album-button').onclick=showAlbum;$('pause-button').onclick=()=>pause();
  $('repeat-button').onclick=()=>say(lastSpeech||V.walk);
  $('sound-button').onclick=()=>{S().settings.sound=!S().settings.sound;stopSpeech();GameAudio.stopAll();GameAudio.update();GameState.save();renderChrome();if(S().settings.sound)say(V.listen);};
  $('parent-button').onclick=()=>parentGate();$('portrait-continue').onclick=()=>$('orientation').classList.add('dismissed');
  if(!S().started)welcome();else{message(S().story>=3?V.back:V.walk);setTimeout(()=>{if(!overlayMode)say(S().story>=3?V.back:V.walk);},650);}
  document.addEventListener('pointerdown',()=>{if(S().settings.sound&&!nativeHidden)GameAudio.unlock();},{passive:true});
  const background=()=>{stopSpeech();stopMelody();GameAudio.suspend();activeGame?.setPaused?.(true);activeCare?.setPaused(true);WORLD.setPaused(true);WORLD.savePositions();GameState.save();};
  const foreground=()=>{if(!document.hidden&&!nativeHidden){activeGame?.setPaused?.(inPause||!!overlayMode);activeCare?.setPaused(inPause);WORLD.setPaused(inPause||!!overlayMode||!!activeGame);updateDailyButton();}};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)background();else foreground();});
  globalThis.addEventListener('pagehide',background);
  globalThis.addEventListener('nativepause',()=>{nativeHidden=true;background();});
  globalThis.addEventListener('nativeresume',()=>{nativeHidden=false;foreground();});
  globalThis.addEventListener('nativesaveimport',e=>{if(e.detail?.json)reviewImport(e.detail.json);});
  globalThis.addEventListener('nativesaveexport',e=>{if(e.detail?.ok)toast('Deine Spielstandsicherung ist gespeichert.');});
  globalThis.addEventListener('nativesaveerror',e=>toast(e.detail?.message||'Die Datei konnte nicht verarbeitet werden.'));
  globalThis.onAndroidBack=()=>{if(inPause)return false;if(activeGame){pause();return true;}if(overlayMode&&overlayMode!=='welcome'){closeOverlay();return true;}pause();return true;};
  setInterval(()=>{if(document.hidden||nativeHidden||inPause||!S().started||['parents','parent-gate','reset','import-review'].includes(overlayMode))return;sessionSeconds++;const minutes=S().settings.sessionMinutes;if(minutes>0&&sessionSeconds>=minutes*60)pause(true);},1000);
  if(GameState.storageWarning)toast('Eine Sicherungsfassung wurde verwendet. Bitte den Spielstand im Elternbereich sichern.');
 }
 globalThis.Wimeloo={world:WORLD,state:GameState,showStory,showCare,showGames,showAlbum,showDecorate,showPark,showChapter,showParents,showDaily,showPassport,concert,exportSave,reviewImport,startGame,care,pause,resume,get overlayMode(){return overlayMode;},get careActivity(){return activeCare;},get activeGame(){return!!activeGame;},get sessionSeconds(){return sessionSeconds;},voiceLines:globalThis.AppVoiceLines};
 globalThis.Sternenbaby=globalThis.Wimeloo; // temporary API alias for legacy tests/plugins
 init();
})();
