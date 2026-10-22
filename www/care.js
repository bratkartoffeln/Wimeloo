/* Sternenbaby — tactile care activities. Each gesture changes the illustrated action. */
(function () {
  'use strict';
  const hints = {
    hands: 'Wasche die Hände. Wische hin und her, oder tippe mehrmals auf die Seife.',
    bottle: 'Bringe das Fläschchen zum Baby. Du kannst es ziehen, oder erst die Flasche und dann das Baby antippen.',
    cuddle: 'Wiege das Baby sanft. Bewege deinen Finger hin und her, oder tippe auf das Herz.',
    ready: 'Lege Tuch, Windel und Kleidung bereit. Tippe die drei Sachen an.',
    clean: 'Wische mit dem weichen Tuch hin und her. Du kannst auch mehrmals auf das Tuch tippen.',
    clothes: 'Wähle die Kleidung für das Baby. Mit dem Haken ist dein Outfit fertig.',
    rattle: 'Bewege die Rassel hin und her. Du kannst sie auch mehrmals antippen.',
    peek: 'Wo ist das Baby? Tippe auf das Tuch und spiele dreimal Kuckuck.',
    smile: 'Schenke dem Baby ein Lächeln. Tippe auf das lachende Gesicht.',
    light: 'Tippe auf die Lampe. Mit jedem Tippen wird das Licht gemütlicher.',
    song: 'Spiele die drei leuchtenden Klänge. Danach hören wir unser Schlaflied.',
    blanket: 'Ziehe die Decke zum Baby. Du kannst auch erst die Decke und dann das Bett antippen.',
    next: 'Das ist geschafft. Tippe auf den Pfeil für den nächsten Schritt.'
  };
  const recipes = {
    feed: [{icon:'wash',mode:'rub',hint:'hands'},{icon:'bottle',mode:'drag',hint:'bottle'},{icon:'cuddle',mode:'rub',hint:'cuddle'}],
    fresh: [{icon:'nappy',mode:'prepare',hint:'ready'},{icon:'cloth',mode:'rub',hint:'clean'},{icon:'shirt',mode:'outfit',hint:'clothes'}],
    play: [{icon:'rattle',mode:'rub',hint:'rattle'},{icon:'peekaboo',mode:'peek',hint:'peek'},{icon:'smile',mode:'smile',hint:'smile'}],
    sleep: [{icon:'lamp',mode:'light',hint:'light'},{icon:'music',mode:'song',hint:'song'},{icon:'blanket',mode:'drag',hint:'blanket'}]
  };
  const colors = ['#b29aff','#80e4d3','#ffd275','#f5a8ce'];
  function open(container, options) {
    const recipe = recipes[options.id];
    if (!recipe) throw new Error('Unknown care activity');
    let step=0, progress=0, visualProgress=0, complete=false, stopped=false, paused=false;
    let selected=false, busy=false, pointer=null, outfit=options.outfit||0, activeTime=0, previous=performance.now(), frame=0;
    let transition=null, lastMotion=0, lastFeedback=0, peekCount=0, renderDirty=true;
    let supplyProgress=[0,0,0],supplySelected=[false,false,false];
    const timers=new Set(), listeners=[];
    const root=document.createElement('section');root.className='care-play';root.dataset.care=options.id;
    root.innerHTML='<div class="care-route" aria-label="Drei gemeinsame Schritte"></div><div class="care-theatre"><canvas aria-label="Die Pflegehandlung wird hier gezeigt"></canvas><div class="care-interaction"></div><div class="care-touch-progress" aria-hidden="true"></div></div><div class="care-tooltray"></div><div class="care-instructions"><button class="care-listen icon-btn" aria-label="Vormachen und Hinweis anhören"></button><p></p><button class="care-next primary" aria-label="Nächster Schritt" hidden></button></div>';
    container.appendChild(root);
    const route=root.querySelector('.care-route'), theatre=root.querySelector('.care-theatre'), canvas=root.querySelector('canvas');
    const interaction=root.querySelector('.care-interaction'), tray=root.querySelector('.care-tooltray');
    const cue=root.querySelector('.care-touch-progress'), copy=root.querySelector('p'), next=root.querySelector('.care-next');
    const listen=root.querySelector('.care-listen');listen.innerHTML=Art.icon('sound');next.innerHTML=Art.icon('arrow');
    function speak(text){if(!paused&&!stopped)options.speak?.(text);}
    function later(fn,delay){const item={remaining:delay,fn};timers.add(item);return item;}
    function btn(icon,label,fn,cls='care-tool'){
      const b=document.createElement('button');b.className=cls;b.innerHTML=Art.icon(icon);b.setAttribute('aria-label',label);
      b.onclick=e=>{if(stopped||paused)return;fn?.(e);};return b;
    }
    function feedback(note=64){if(activeTime-lastFeedback>90){options.sound?.(note);lastFeedback=activeTime;}}
    function progressDots(){cue.innerHTML=[0,1,2,3].map(i=>'<i class="'+(i<Math.round(progress*4)?'filled':'')+'"></i>').join('');}
    function finishStep(){
      if(complete||stopped||busy)return;busy=true;progress=1;visualProgress=1;progressDots();renderDirty=true;
      root.dataset.stepComplete='true';feedback(72);speak(options.steps?.[step]?.[2]||hints.next);
      interaction.classList.add('care-step-finished');tray.querySelectorAll('button').forEach(b=>b.disabled=true);
      later(()=>{
        if(step===2){complete=true;route.querySelectorAll('.care-route-step').forEach(b=>b.classList.add('done'));root.dataset.completed='true';options.onComplete?.({outfit});}
        else{next.hidden=false;next.focus({preventScroll:true});}
        busy=false;
      },options.reducedMotion?350:1000);
    }
    function add(amount){if(busy||complete||paused||stopped)return;progress=Math.min(1,progress+amount);renderDirty=true;progressDots();if(progress>=1)finishStep();}
    function animateToEnd(duration=1800){
      if(busy||complete||transition)return;selected=false;interaction.classList.add('enacting');tray.classList.add('enacting');
      transition={elapsed:0,duration,from:progress};
    }
    function showGuide(){
      root.classList.remove('show-guide');void root.offsetWidth;root.classList.add('show-guide');
      later(()=>root.classList.remove('show-guide'),3600);speak(hints[recipe[step].hint]);
    }
    listen.onclick=showGuide;
    next.onclick=()=>{if(stopped||paused||busy||step>=2)return;step++;buildStep();};
    function buildStep(){
      progress=0;visualProgress=0;busy=false;selected=false;pointer=null;peekCount=0;transition=null;next.hidden=true;
      supplyProgress=[0,0,0];supplySelected=[false,false,false];
      root.dataset.step=String(step);root.dataset.stepComplete='false';root.classList.remove('show-guide');
      route.innerHTML='';interaction.replaceChildren();interaction.className='care-interaction';tray.replaceChildren();tray.className='care-tooltray';
      recipe.forEach((data,i)=>{
        const b=btn(data.icon,options.steps?.[i]?.[1]||'Schritt '+(i+1),()=>speak(i===step?hints[data.hint]:options.steps?.[i]?.[2]),'care-route-step'+(i<step?' done':'')+(i===step?' current':''));
        b.setAttribute('aria-current',i===step?'step':'false');b.disabled=i>step;
        if(i<step)b.insertAdjacentHTML('beforeend','<i>'+Art.icon('check')+'</i>');route.appendChild(b);
      });
      const data=recipe[step];copy.textContent=hints[data.hint];progressDots();renderDirty=true;
      if(data.mode==='prepare'){
        const used=new Set();
        ['cloth','nappy','shirt'].forEach((icon,i)=>{const b=btn(icon,['Weiches Tuch','Frische Windel','Gemütliche Kleidung'][i],()=>{
          if(used.has(i)||busy)return;used.add(i);supplySelected[i]=true;b.classList.add('collected');b.disabled=true;feedback(60+i*3);add(1/3+.001);
        });b.dataset.supply=icon;tray.appendChild(b);});
        const basket=document.createElement('div');basket.className='care-basket';basket.innerHTML=Art.icon('bag');interaction.appendChild(basket);
      }else if(data.mode==='outfit'){
        colors.forEach((color,i)=>{const b=btn('shirt','Kleidung '+(i+1)+' auswählen',()=>{
          outfit=i;progress=.65;renderDirty=true;progressDots();tray.querySelectorAll('[data-outfit]').forEach(e=>e.classList.toggle('selected',e===b));confirm.hidden=false;feedback(60+i*2);
        });b.style.setProperty('--tool-color',color);b.dataset.outfit=String(i);tray.appendChild(b);});
        const confirm=btn('check','Dieses Outfit anziehen',()=>animateToEnd(1300),'care-tool care-confirm');confirm.hidden=true;tray.appendChild(confirm);
      }else if(data.mode==='song'){
        const played=new Set();[60,64,67].forEach((note,i)=>{const b=btn('music','Klang '+(i+1)+' spielen',()=>{
          if(busy)return;options.sound?.(note);b.classList.add('sounded');if(!played.has(i)){played.add(i);add(1/3+.001);}if(played.size===3)options.melody?.();
        });b.style.setProperty('--tool-color',colors[i]);b.dataset.note=String(note);tray.appendChild(b);});
      }else if(data.mode==='drag'){
        const target=btn(options.id==='feed'?'baby':'bed',options.id==='feed'?'Fläschchen zum Baby bringen':'Decke über das Baby legen',()=>{if(selected)animateToEnd(options.id==='feed'?2600:1700);else showGuide();},'care-dropzone');
        target.dataset.dropzone='true';interaction.appendChild(target);
        const tool=btn(data.icon,options.id==='feed'?'Fläschchen nehmen':'Decke nehmen',()=>{if(busy||transition)return;selected=true;tool.classList.add('selected');target.classList.add('ready');});
        tool.dataset.draggable='true';tool.style.touchAction='none';tray.appendChild(tool);
        tool.addEventListener('pointerdown',e=>{
          if(busy||transition||paused)return;e.preventDefault();pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,tool};
          tool.setPointerCapture(e.pointerId);selected=true;tool.classList.add('selected');target.classList.add('ready');
        });
        tool.addEventListener('pointermove',e=>{
          if(!pointer||e.pointerId!==pointer.id||paused)return;const dx=e.clientX-pointer.startX,dy=e.clientY-pointer.startY;
          pointer.moved||=Math.hypot(dx,dy)>8;tool.style.transform='translate('+dx+'px,'+dy+'px)';
          const r=target.getBoundingClientRect();target.classList.toggle('over',e.clientX>=r.left-25&&e.clientX<=r.right+25&&e.clientY>=r.top-25&&e.clientY<=r.bottom+25);
        });
        const release=e=>{if(!pointer||e.pointerId!==pointer.id)return;const r=target.getBoundingClientRect();const hit=e.type!=='pointercancel'&&pointer.moved&&e.clientX>=r.left-25&&e.clientX<=r.right+25&&e.clientY>=r.top-25&&e.clientY<=r.bottom+25;
          tool.style.transform='';pointer=null;target.classList.remove('over');if(hit)animateToEnd(options.id==='feed'?2600:1700);
        };tool.addEventListener('pointerup',release);tool.addEventListener('pointercancel',release);
      }else{
        const action=btn(data.icon,hints[data.hint],()=>{
          if(busy||transition)return;
          lastMotion=activeTime;renderDirty=true;
          if(data.mode==='peek'){
            if(root.classList.contains('peeking'))return;peekCount++;root.classList.add('peeking');visualProgress=1;renderDirty=true;feedback(67);
            later(()=>{root.classList.remove('peeking');add(1/3+.001);visualProgress=0;},650);
          }else if(data.mode==='light')add(1/3+.001);
          else if(data.mode==='smile'){animateToEnd(1700);feedback(69);}
          else add(.25);
          feedback();
        },'care-action-orb');action.dataset.action=data.mode;interaction.appendChild(action);
        if(data.mode==='rub'){
          action.style.touchAction='none';
          action.addEventListener('pointerdown',e=>{if(busy||paused)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};action.setPointerCapture(e.pointerId);});
          action.addEventListener('pointermove',e=>{
            if(!pointer||e.pointerId!==pointer.id||busy||paused)return;
            const distance=Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y);pointer.x=e.clientX;pointer.y=e.clientY;
            if(distance>3){pointer.moved=true;lastMotion=activeTime;add(Math.min(distance,35)/400);feedback(60+Math.floor(progress*5)*2);}
          });
          const release=()=>{pointer=null;};action.addEventListener('pointerup',release);action.addEventListener('pointercancel',release);
        }
        const guide=document.createElement('span');guide.className='care-gesture-guide';guide.innerHTML=Art.icon('hand');guide.setAttribute('aria-hidden','true');interaction.appendChild(guide);
      }
      later(showGuide,130);
    }
    function draw(){
      const width=canvas.clientWidth||600,height=canvas.clientHeight||340,dpr=Math.min(devicePixelRatio||1,2);
      if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
      const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
      if(Art.drawCareScene)Art.drawCareScene(ctx,{x:0,y:0,width,height,type:options.id,step,progress:visualProgress,time:activeTime,role:options.role,stage:options.stage,blanket:colors[outfit],outfit,supplyProgress,active:!!transition||!!pointer||activeTime-lastMotion<600,reducedMotion:!!options.reducedMotion,completed:complete});
      else Art.drawCharacter(ctx,{x:width*.45,y:height*.9,scale:height/150,role:options.role,holdingBaby:true,time:activeTime,action:options.id});
      // Use exactly the same virtual 900×340 stage as Art. Percent-of-container
      // hotspots drift whenever the artwork has letterboxing on a smaller tablet.
      const scale=Math.min(width/900,height/340),ox=(width-900*scale)/2,oy=(height-340*scale)/2;
      const positions={feed:[[320,238,145,112],[648,212,146,126],[648,218,152,140]],fresh:[[465,272,140,105],[665,242,150,112],[665,242,150,112]],play:[[723,192,112,128],[635,211,153,112],[665,225,180,140]],sleep:[[830,191,114,252],[480,236,120,100],[666,237,244,132]]};
      const [x,y,ww,hh]=positions[options.id][step],hit=interaction.querySelector('.care-action-orb,.care-dropzone');
      if(hit){const bw=Math.max(70,ww*scale),bh=Math.max(70,hh*scale);Object.assign(hit.style,{left:(ox+x*scale-bw/2)+'px',top:(oy+y*scale-bh/2)+'px',right:'auto',bottom:'auto',width:bw+'px',height:bh+'px'});}
      const guide=interaction.querySelector('.care-gesture-guide');if(guide)Object.assign(guide.style,{left:(ox+x*scale+7)+'px',top:(oy+(options.id==='sleep'&&step===0?99:y)*scale)+'px',right:'auto',bottom:'auto'});
      renderDirty=false;
    }
    function tick(now){
      if(stopped)return;const dt=Math.min(60,now-previous);previous=now;
      if(!paused&&!document.hidden){
        activeTime+=dt;
        for(const task of [...timers]){task.remaining-=dt;if(task.remaining<=0){timers.delete(task);task.fn();}}
        if(transition){transition.elapsed+=dt;progress=transition.from+(1-transition.from)*Math.min(1,transition.elapsed/transition.duration);progressDots();renderDirty=true;if(progress>=1){transition=null;finishStep();}}
        if(recipe[step].mode==='peek')visualProgress=root.classList.contains('peeking')||progress>=1?1:0;
        else visualProgress=options.reducedMotion?progress:visualProgress+(progress-visualProgress)*Math.min(1,dt/100);
        supplyProgress=supplyProgress.map((p,i)=>options.reducedMotion?(supplySelected[i]?1:0):Math.min(1,p+(supplySelected[i]?dt/650:0)));
        if(renderDirty||!options.reducedMotion)draw();
      }
      frame=requestAnimationFrame(tick);
    }
    buildStep();frame=requestAnimationFrame(tick);
    const resize=()=>{renderDirty=true;};window.addEventListener('resize',resize);listeners.push([window,'resize',resize]);
    const sceneTap=e=>{
      if(e.target!==canvas||paused||busy||recipe[step].mode!=='prepare')return;
      const r=canvas.getBoundingClientRect(),s=Math.min(r.width/900,r.height/340),x=(e.clientX-r.left-(r.width-900*s)/2)/s,y=(e.clientY-r.top-(r.height-340*s)/2)/s;
      const choices=[...tray.querySelectorAll('[data-supply]')].map((b,i)=>({b,d:Math.hypot(x-(410+i*80),y-290)})).filter(v=>!v.b.disabled).sort((a,b)=>a.d-b.d);
      if(choices[0]?.d<52)choices[0].b.click();
    };canvas.addEventListener('click',sceneTap);listeners.push([canvas,'click',sceneTap]);
    return{
      setPaused(value){paused=!!value;pointer=null;tray.querySelectorAll('[data-draggable]').forEach(b=>b.style.transform='');previous=performance.now();},
      destroy(){stopped=true;cancelAnimationFrame(frame);timers.clear();listeners.forEach(([el,event,fn])=>el.removeEventListener(event,fn));root.remove();},
      get snapshot(){return{step,progress,complete,paused,outfit};}
    };
  }
  globalThis.CarePlay=Object.freeze({open,voiceLines:Object.values(hints)});
})();
