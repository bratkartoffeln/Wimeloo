/* Isometric tap-to-walk world, A* navigation and depth-sorted canvas scene. */
(function(global){
 'use strict';
 const W=18,H=16,HW=32,HH=16;
 const objects=[
  {id:'crib',type:'crib',x:3.5,y:3.5,cells:[[3,3],[4,3],[3,4],[4,4]],action:'care',label:'Baby',icon:'baby',height:92,labelDY:-20},
  {id:'dresser',type:'dresser',x:5.6,y:2.8,cells:[[5,3],[6,3]],action:'sorting',label:'Anziehen',icon:'shirt',height:82,labelDY:15},
  {id:'sofa',type:'sofa',x:8.7,y:3,cells:[[8,3],[9,3],[10,3]],action:'story',label:'Geschichte',icon:'album',height:88},
  {id:'table',type:'table',x:9.5,y:6,cells:[[9,6],[10,6]],action:'counting',label:'Picknick',icon:'food',height:78,labelBelow:39},
  {id:'piano',type:'piano',x:3.5,y:9,cells:[[3,9],[4,9]],action:'music',label:'Musik',icon:'music',height:87},
  {id:'easel',type:'easel',x:6,y:10,cells:[[6,10]],action:'decorate',label:'Gestalten',icon:'palette',height:95,labelBelow:38,labelDX:-70},
  {id:'speaker',type:'speaker',x:2.3,y:7.5,cells:[[2,8]],height:70},
  {id:'plant1',type:'plant',x:2,y:10.7,cells:[[2,11]],height:75},
  {id:'lamp',type:'lamp',x:11,y:3,cells:[[11,3]],height:100},
  {id:'plant2',type:'plant',x:11,y:10.8,cells:[[11,11]],height:80},
  {id:'baby_mat',type:'baby_mat',x:5,y:5.8,cells:[],height:35},
  {id:'rug',type:'rug',x:8,y:5,cells:[],height:10},
  {id:'tree1',type:'tree',x:15,y:3.5,cells:[[15,3],[15,4]],height:115},
  {id:'bench',type:'bench',x:14.5,y:8,cells:[[14,8],[15,8]],action:'park',label:'Garten',icon:'sun',height:76,labelBelow:41,labelDX:5},
  {id:'flowerbox',type:'flowerbox',x:13.6,y:12,cells:[[13,12],[14,12]],height:55},
  {id:'tree2',type:'tree',x:15.2,y:13,cells:[[15,13]],height:115},
  {id:'gift',type:'gift',x:7,y:2.5,cells:[[7,2]],height:40},
  {id:'shapes',type:'shape_garden',x:14.1,y:5.9,cells:[[14,6],[15,6]],action:'shapes',label:'Formengarten',icon:'shapes',height:75},
  {id:'memory',type:'memory_table',x:8,y:9,cells:[[8,9]],action:'memory',label:'Bildpaare',icon:'memory',height:70,labelBelow:40,labelDX:-5},
  {id:'patterns',type:'bead_stand',x:10,y:10.2,cells:[[10,10]],action:'patterns',label:'Musterketten',icon:'patterns',height:90,labelBelow:88,labelDX:-18},
  {id:'garden_stage',type:'stage',x:15,y:10.6,cells:[[15,10],[16,10],[15,11],[16,11]],height:90}

 ];
 function grid(){const a=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>x>0&&y>0&&x<W-1&&y<H-1));
   for(let x=1;x<=11;x++)a[1][x]=false;for(let y=1;y<=11;y++)a[y][1]=false;
   for(const o of objects)for(const [x,y]of o.cells)a[y][x]=false;return a;}
 const nav=grid();
 const inside=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
 const walkable=(x,y)=>inside(x,y)&&nav[y][x];
 function nearest(x,y){x=Math.round(Math.max(1,Math.min(W-2,x)));y=Math.round(Math.max(1,Math.min(H-2,y)));if(walkable(x,y))return{x,y};
   for(let r=1;r<18;r++){let best=null,dist=1e9;for(let yy=y-r;yy<=y+r;yy++)for(let xx=x-r;xx<=x+r;xx++){if(walkable(xx,yy)){const d=(xx-x)**2+(yy-y)**2;if(d<dist){dist=d;best={x:xx,y:yy};}}}if(best)return best;}return{x:8,y:7};}
 function pathfind(start,end){const a=nearest(start.x,start.y),b=nearest(end.x,end.y);const key=p=>p.x+','+p.y;const open=[{...a,g:0,f:0}],seen=new Set(),cost=new Map([[key(a),0]]),parents=new Map();
   while(open.length){open.sort((p,q)=>p.f-q.f);const p=open.shift(),pk=key(p);if(seen.has(pk))continue;seen.add(pk);if(p.x===b.x&&p.y===b.y){const out=[];let k=pk;while(k!==key(a)){const [x,y]=k.split(',').map(Number);out.unshift({x,y});k=parents.get(k);if(!k)break;}return out;}
     for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=p.x+dx,y=p.y+dy;if(!walkable(x,y)||(dx&&dy&&(!walkable(p.x+dx,p.y)||!walkable(p.x,p.y+dy))))continue;const nk=x+','+y,g=p.g+(dx&&dy?1.414:1);if(g>=(cost.get(nk)??Infinity))continue;cost.set(nk,g);parents.set(nk,pk);open.push({x,y,g,f:g+Math.hypot(b.x-x,b.y-y)});}
   }return[];
 }
 function diamond(ctx,x,y,w,h,fill){ctx.beginPath();ctx.moveTo(x,y-h);ctx.lineTo(x+w,y);ctx.lineTo(x,y+h);ctx.lineTo(x-w,y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
 function roundrect(ctx,x,y,w,h,r,fill){global.Art.roundRect(ctx,x,y,w,h,r,fill);}
 class World{
  constructor(canvas,state,opts={}) {
   this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.state=state;this.opts=opts;
   this.actors=Object.fromEntries(['rumi','mira','zoey'].map((role,i)=>{
    const p=nearest(state.positions[role].x,state.positions[role].y);
    return[role,{role,...p,path:[],facing:'se',walk:0,moving:false,nextIdle:3+i*3,holdingBaby:false,
      action:role===state.selected?{kind:'wave',remaining:3,duration:3}:null}];
   }));
   this.camera={x:0,y:0,scale:1};this.paused=false;this.dirty=true;this.last=0;this.elapsed=0;
   this.marker=null;this.pending=null;this.interactionTimer=0;this.interactionToken=0;this.pointers=new Map();
   this.labels=[];this.frame=0;this.timeout=0;this.visible=!document.hidden;this.destroyed=false;
   this.reduced=!!state.settings.reduceMotion;this.reaction=null;this.floorCache=null;this.floorKey='';this.listeners=[];
   this.loop=this.loop.bind(this);this.createLabels();this.resize();this.bind();if(this.visible)this.loop(0);
  }
  project(x,y){return{x:this.camera.x+(x-y)*HW*this.camera.scale,y:this.camera.y+(x+y)*HH*this.camera.scale};}
  unproject(x,y){const xx=(x-this.camera.x)/this.camera.scale,yy=(y-this.camera.y)/this.camera.scale;return{x:(xx/HW+yy/HH)/2,y:(yy/HH-xx/HW)/2};}
  resetCamera(){const width=this.width,height=this.height;const availableH=height-(height<560?155:205);const fit=Math.min((width-150)/1088,availableH/612);this.fit=Math.max(.36,Math.min(1.25,fit));this.minZoom=this.fit*.8;this.maxZoom=Math.max(3.2,this.fit*4.5);this.camera.scale=this.fit;this.camera.x=width/2-25*this.fit+20;this.camera.y=(height<560?59:82)+94*this.fit;this.cameraChanged();}
  // Zoom is centred on the fingers (or on the visible play area for + / −).
  // Keeping this world point fixed also avoids the old "sliding under your fingers" effect.
  setZoom(scale,anchor={x:this.width*.55,y:this.height*.46}) {
   if(!Number.isFinite(scale)||!Number.isFinite(anchor.x)||!Number.isFinite(anchor.y))return this.camera.scale;
   const point=this.unproject(anchor.x,anchor.y);
   this.camera.scale=Math.max(this.minZoom,Math.min(this.maxZoom,scale));
   this.camera.x=anchor.x-(point.x-point.y)*HW*this.camera.scale;
   this.camera.y=anchor.y-(point.x+point.y)*HH*this.camera.scale;
   this.cameraChanged();return this.camera.scale;
  }
  zoomBy(factor,anchor){return this.setZoom(this.camera.scale*factor,anchor);}
  cameraChanged(){
   // Camera movement is input feedback, not decorative animation. Paint canvas and pins in
   // the same turn even with reduced motion; a throttled canvas with immediate DOM pins drifts.
   this.dirty=true;
   if(this.visible&&!this.destroyed){this.render(this.elapsed*1000);this.dirty=false;}else this.updateLabels();
   this.opts.onCamera?.({...this.camera});
  }
  resize(){this.width=this.canvas.clientWidth;this.height=this.canvas.clientHeight;this.dpr=Math.min(global.devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.resetCamera();}
  bind() {
   const listen=(target,event,fn,options)=>{target.addEventListener(event,fn,options);this.listeners.push(()=>target.removeEventListener(event,fn,options));};
   listen(global,'resize',()=>this.resize());
   listen(document,'visibilitychange',()=>{
    this.visible=!document.hidden;cancelAnimationFrame(this.frame);clearTimeout(this.timeout);
    this.frame=0;this.timeout=0;this.last=0;
    if(this.visible){this.dirty=true;this.loop(0);}else{this.pointers.clear();this.pinch=null;this.savePositions();}
   });
   const pointerDown=e=>{
    if(this.paused||(e.pointerType==='mouse'&&e.button!==0))return;
    e.preventDefault();
    const label=e.target.closest?.('.game-location');
    this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,labelId:label?.dataset.objectId||null});
    // Capture on the canvas for both origins: labels and uncovered floor share one gesture.
    // A button therefore never eats a swipe, nor synthesizes a second click after pointerup.
    try{this.canvas.setPointerCapture(e.pointerId);}catch(error){/* A cancelled native pointer needs no capture. */}
    if(this.pointers.size===1)this.drag=false;
    if(this.pointers.size>=2){
     const p=[...this.pointers.values()],r=this.canvas.getBoundingClientRect();
     const mid={x:(p[0].x+p[1].x)/2-r.left,y:(p[0].y+p[1].y)/2-r.top};
     this.drag=true;this.pinch={dist:Math.max(1,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)),scale:this.camera.scale,world:this.unproject(mid.x,mid.y)};
    }
   };
   const pointerMove=e=>{
    const p=this.pointers.get(e.pointerId);if(!p||this.paused)return;
    e.preventDefault();
    const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
    if(this.pointers.size>=2&&this.pinch){
     const pts=[...this.pointers.values()],r=this.canvas.getBoundingClientRect(),dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),point=this.pinch.world;
     const mid={x:(pts[0].x+pts[1].x)/2-r.left,y:(pts[0].y+pts[1].y)/2-r.top};
     this.camera.scale=Math.max(this.minZoom,Math.min(this.maxZoom,this.pinch.scale*dist/this.pinch.dist));
     this.camera.x=mid.x-(point.x-point.y)*HW*this.camera.scale;
     this.camera.y=mid.y-(point.x+point.y)*HH*this.camera.scale;
     this.drag=true;this.cameraChanged();
    }else if(this.drag||Math.hypot(p.x-p.sx,p.y-p.sy)>10){
     // Include the initial travel when crossing the threshold instead of losing its first pixels.
     this.camera.x+=this.drag?dx:p.x-p.sx;this.camera.y+=this.drag?dy:p.y-p.sy;
     this.drag=true;this.cameraChanged();
    }
   };
   const pointerUp=e=>{
    const p=this.pointers.get(e.pointerId);
    if(p&&!this.drag&&this.pointers.size===1&&!this.paused){
     if(p.labelId)this.goToObject(p.labelId);
     else{const r=this.canvas.getBoundingClientRect();this.tap(e.clientX-r.left,e.clientY-r.top);}
    }
    this.pointers.delete(e.pointerId);this.pinch=null;
    if(!this.pointers.size)this.drag=false;
   };
   const pointerCancel=e=>{this.pointers.delete(e.pointerId);this.pinch=null;this.drag=this.pointers.size>0;};
   for(const surface of [this.canvas,document.getElementById('floating-actions')].filter(Boolean)){
    listen(surface,'pointerdown',pointerDown,{passive:false});listen(surface,'pointermove',pointerMove,{passive:false});
    listen(surface,'pointerup',pointerUp);listen(surface,'pointercancel',pointerCancel);
   }
   // Optional mouse wheel support uses the identical anchored camera path.
   listen(this.canvas,'wheel',e=>{if(this.paused)return;e.preventDefault();const r=this.canvas.getBoundingClientRect();this.zoomBy(Math.exp(-e.deltaY*.0015),{x:e.clientX-r.left,y:e.clientY-r.top});},{passive:false});
  }
  createLabels(){const host=document.getElementById('floating-actions');if(!host)return;host.replaceChildren();for(const o of objects.filter(o=>o.action)){
   const button=document.createElement('button');button.className='game-location'+(o.labelBelow?' below':'');button.type='button';button.dataset.action=o.action;button.dataset.objectId=o.id;
   button.innerHTML=(this.opts.icon?.(o.icon)||'')+'<span>'+o.label+'</span>';button.setAttribute('aria-label',o.label+' besuchen');
   // Inline geometry intentionally wins over generic button:active transforms. Previously a
   // pressed pin jumped away from the finger, so a release no longer generated a click.
   button.style.transform='none';button.style.touchAction='none';
   button.addEventListener('click',e=>{e.preventDefault();if(e.detail===0&&!this.paused)this.goToObject(o.id);});
   host.appendChild(button);this.labels.push({button,o});
  }}
  updateLabels() {
   const viewport=this.width+'x'+this.height;
   const blockerKey=viewport+'|'+(document.getElementById('message-text')?.textContent||'');
   const layoutKey=[blockerKey,this.camera.x,this.camera.y,this.camera.scale,this.paused].join('|');
   if(this.labelLayoutKey===layoutKey){for(const {button,o}of this.labels)button.classList.toggle('active',this.pending?.id===o.id);return;}
   this.labelLayoutKey=layoutKey;
   // World pins have one immutable world-space anchor. They are never reflowed around
   // screen UI or one another; panning therefore moves a pin exactly with its furniture.
   // Screen UI is above pins in stacking order, and the same swipe handler works on pins.
   for(const entry of this.labels){
    const {button,o}=entry,p=this.project(o.x,o.y);
    p.x+=(o.labelDX||0)*this.camera.scale;p.y+=((o.labelBelow||-o.height)+(o.labelDY||0))*this.camera.scale;
    if(entry.viewport!==viewport){button.hidden=false;entry.width=button.offsetWidth||56;entry.height=button.offsetHeight||56;entry.viewport=viewport;}
    const width=entry.width,height=entry.height;
    button.hidden=p.x+width/2<0||p.x-width/2>this.width||p.y<0||p.y-height>this.height;
    button.tabIndex=this.paused?-1:0;button.classList.toggle('active',this.pending?.id===o.id);
    const left=(p.x-width/2)+'px',top=(p.y-height)+'px';
    if(button.style.left!==left)button.style.left=left;if(button.style.top!==top)button.style.top=top;
   }
  }
  select(role){if(!this.actors[role])return;clearTimeout(this.interactionTimer);this.interactionToken++;this.state.selected=role;const actor=this.actors[role];actor.path=[];actor.idleDestination=null;actor.moving=false;actor.holdingBaby=false;actor.action={kind:'wave',remaining:2.6,duration:2.6};this.pending=null;this.dirty=true;this.updateLabels();this.opts.onSelect?.(role);}
  tap(x,y){const actors=Object.values(this.actors).sort((a,b)=>(b.x+b.y)-(a.x+a.y));for(const a of actors){const p=this.project(a.x,a.y);if(Math.abs(x-p.x)<25*this.camera.scale+10&&y<p.y+8&&y>p.y-100*this.camera.scale){this.select(a.role);return;}}
   const targets=objects.filter(o=>o.action).sort((a,b)=>(b.x+b.y)-(a.x+a.y));for(const o of targets){const p=this.project(o.x,o.y),bounds=global.Art?.bounds?.[o.type]||{w:64,h:o.height};if(Math.abs(x-p.x)<bounds.w*.5*this.camera.scale&&y<p.y+8*this.camera.scale&&y>p.y-Math.max(o.height,bounds.h)*this.camera.scale){this.goToObject(o.id);return;}}
   const p=this.unproject(x,y);if(p.x<0||p.x>W-1||p.y<0||p.y>H-1)return;this.go(nearest(p.x,p.y));this.opts.onMove?.();}
  go(target,callback=null){clearTimeout(this.interactionTimer);const token=++this.interactionToken;const actor=this.actors[this.state.selected];actor.action=null;actor.holdingBaby=false;actor.idleDestination=null;this.pending=callback;const end=nearest(target.x,target.y);actor.path=pathfind(actor,end);this.marker={...end,time:1.6};this.dirty=true;this.updateLabels();if(!actor.path.length&&Math.hypot(actor.x-end.x,actor.y-end.y)<.8){const pending=this.pending;this.pending=null;if(pending)this.interactionTimer=setTimeout(()=>{if(!this.paused&&this.visible&&token===this.interactionToken)this.opts.onInteract?.(pending.action);},100);} }
  goToObject(id){const o=objects.find(o=>o.id===id);if(!o)return;const a=this.actors[this.state.selected];let candidates=[];for(let yy=Math.floor(o.y)-2;yy<=Math.ceil(o.y)+2;yy++)for(let xx=Math.floor(o.x)-2;xx<=Math.ceil(o.x)+2;xx++){if(walkable(xx,yy)&&Math.hypot(xx-o.x,yy-o.y)<=2.4){const path=pathfind(a,{x:xx,y:yy});if(path.length||Math.hypot(a.x-xx,a.y-yy)<.8)candidates.push({x:xx,y:yy,score:path.length+Math.hypot(xx-o.x,yy-o.y)*.9+(xx+yy<o.x+o.y?.8:0)});}}candidates.sort((a,b)=>a.score-b.score);if(candidates.length)this.go(candidates[0],o);}
  setPaused(value) {
   this.paused=!!value;this.dirty=true;this.last=0;this.pointers.clear();this.pinch=null;
   if(value){clearTimeout(this.interactionTimer);this.interactionToken++;this.savePositions();}
  }
  savePositions(){for(const [r,a]of Object.entries(this.actors))this.state.positions[r]={x:a.x,y:a.y};this.opts.onSave?.();}
  // Reactions are measured in active world time. A panel or app pause never consumes them.
  react(action,options={}) {
   const aliases={fresh:'wash',sorting:'celebrate',counting:'celebrate',shapes:'celebrate',memory:'celebrate',patterns:'celebrate'};
   action=aliases[action]||action;
   if(!['wave','feed','wash','play','sleep','celebrate','music'].includes(action))action='celebrate';
   const duration=Math.max(1,Math.min(12,Number(options.duration)||5.5));
   const selected=this.actors[this.state.selected];
   this.reaction={kind:action,duration,remaining:duration,x:selected.x,y:selected.y};
   for(const a of Object.values(this.actors)){
    a.holdingBaby=false;
    if(a===selected||action==='celebrate'||action==='music'){
     a.path=[];a.idleDestination=null;a.moving=false;
     a.action={kind:action,duration,remaining:duration};a.facing=a.facing[1]==='w'?'sw':'se';
     if(a===selected&&this.state.story>=3&&(action==='feed'||action==='play'))a.holdingBaby=true;
    }
   }
   this.dirty=true;
  }
  celebrate(options={}) {this.react('celebrate',options);}
  update(dt) {
   this.reduced=!!this.state.settings.reduceMotion;
   if(this.paused){for(const a of Object.values(this.actors))a.moving=false;return false;}
   this.elapsed+=dt;let active=false;
   for(const a of Object.values(this.actors)){
    a.moving=false;
    if(a.action){a.action.remaining=Math.max(0,a.action.remaining-dt);if(!a.action.remaining){a.action=null;a.holdingBaby=false;this.dirty=true;}else if(!this.reduced)active=true;}
    if(a.path.length){
     const target=a.path[0],dx=target.x-a.x,dy=target.y-a.y,len=Math.hypot(dx,dy),step=dt*2.65;
     if(len<=step){
      a.x=target.x;a.y=target.y;a.path.shift();
      if(!a.path.length&&a.idleDestination){a.action={kind:a.idleDestination,remaining:4.4,duration:4.4};a.idleDestination=null;a.facing='se';}
      if(!a.path.length&&a.role===this.state.selected&&this.pending){
       const pending=this.pending;this.pending=null;this.updateLabels();this.savePositions();this.opts.onInteract?.(pending.action);
      }
     }else{a.x+=dx/len*step;a.y+=dy/len*step;}
     if(len>.001)a.facing=dx+dy>=0?(dx-dy>=0?'se':'sw'):(dx-dy>=0?'ne':'nw');
     a.walk=(a.walk+dt*2.15)%1;a.moving=true;active=true;
    }
    if(!this.reduced&&!a.action&&!a.path.length&&a.role!==this.state.selected&&this.elapsed>a.nextIdle){
     a.nextIdle=this.elapsed+10+Math.random()*9;
     // Friends actually visit places and act there, rather than standing still for half a minute.
     const activities=[{x:4,y:8,action:'music'},{x:13,y:6,action:'play'},{x:7,y:4,action:'wave'},{x:13,y:10,action:'music'}];
     const activity=activities[Math.floor(Math.random()*activities.length)],end=nearest(activity.x,activity.y);
     a.path=pathfind(a,end);a.idleDestination=activity.action;
     if(!a.path.length){a.action={kind:activity.action,remaining:4.4,duration:4.4};a.idleDestination=null;}
    }
   }
   if(this.reaction){this.reaction.remaining=Math.max(0,this.reaction.remaining-dt);if(!this.reaction.remaining){this.reaction=null;this.dirty=true;}else if(!this.reduced)active=true;}
   if(this.marker){this.marker.time-=dt;if(this.marker.time<=0)this.marker=null;active=true;}
   return active;
  }
  loop(timestamp) {
   if(!this.visible||this.destroyed)return;
   const now=timestamp||performance.now(),dt=this.last?Math.min(.25,(now-this.last)/1000):.016;this.last=now;
   const active=this.update(dt);
   if(this.dirty||active||(!this.paused&&!this.reduced)){this.render(this.elapsed*1000);this.dirty=false;}
   // Timed RAF caps rendering even on high-refresh displays. Scenery does not need 60 FPS.
   const delay=this.paused?300:active?22:this.reduced?180:50;
   this.timeout=setTimeout(()=>{this.frame=requestAnimationFrame(this.loop);},delay);
  }
  destroy() {
   this.destroyed=true;cancelAnimationFrame(this.frame);clearTimeout(this.timeout);clearTimeout(this.interactionTimer);
   for(const remove of this.listeners)remove();this.listeners=[];this.pointers.clear();
   for(const {button}of this.labels)button.remove();this.labels=[];this.floorCache=null;
  }
  cachedFloor(ctx) {
   const decorations=(this.state.decorations||[]).slice().sort(),key=[this.state.wall,this.dpr,decorations.join(',')].join('|');
   if(!this.floorCache||this.floorKey!==key){
    const factor=Math.min(this.dpr,1.5),canvas=document.createElement('canvas');canvas.width=Math.ceil(1160*factor);canvas.height=Math.ceil(760*factor);
    const c=canvas.getContext('2d');c.scale(factor,factor);c.translate(520,110);this.floor(c);this.floorCache=canvas;this.floorKey=key;
   }
   ctx.drawImage(this.floorCache,-520,-110,1160,760);
  }
  floor(ctx){const walls=['#c8b1eb','#b5d8d8','#e4afc9','#dcd2bc'];const wall=walls[this.state.wall]||walls[0];
   // floating garden foundation
   const p=(x,y)=>({x:(x-y)*HW,y:(x+y)*HH});const a=p(0,0),b=p(W-1,0),c=p(W-1,H-1),d=p(0,H-1);
   ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(c.x,c.y);ctx.lineTo(c.x,c.y+22);ctx.lineTo(d.x,d.y+22);ctx.closePath();ctx.fillStyle='#58798d';ctx.fill();ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(c.x,c.y+22);ctx.lineTo(b.x,b.y+22);ctx.closePath();ctx.fillStyle='#3c5d7b';ctx.fill();
   for(let sum=0;sum<W+H;sum++)for(let x=0;x<W;x++){const y=sum-x;if(y<0||y>=H)continue;const pt=p(x,y);const interior=x>=2&&x<=11&&y>=2&&y<=11;let fill;if(interior){if(x<=6&&y<=6)fill=((x+y)%2?'#e9daf4':'#f4e7fb');else if(x>6&&y<=6)fill=((x+y)%2?'#ead3d8':'#f5e0df');else if(x<=6)fill=((x+y)%2?'#cbe4e6':'#daf0ee');else fill=((x+y)%2?'#eadbc8':'#f5e8d7');}else{fill=((x*7+y*3)%4===0?'#77a6a2':'#82b6aa');if((x===12&&y>=4)||(y===12&&x>=4&&x<=14))fill='#d5c6e1';}
     diamond(ctx,pt.x,pt.y,HW+.3,HH+.2,fill);if(interior&&((x+y)%2===0)){ctx.strokeStyle='#ffffff35';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(pt.x-HW+5,pt.y+2);ctx.lineTo(pt.x-2,pt.y+HH-2);ctx.stroke();}if(!interior&&x>0&&y>0&&((x*17+y*11)%17===3)){ctx.strokeStyle='#96b99577';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(pt.x,pt.y);ctx.lineTo(pt.x-3,pt.y-4);ctx.moveTo(pt.x+2,pt.y);ctx.lineTo(pt.x+4,pt.y-5);ctx.stroke();}}
   // low open dollhouse walls at the far edges, never hiding the play area
   for(const edge of [0,1]){const start=edge?p(1.5,1.5):p(1.5,1.5),end=edge?p(1.5,11.5):p(11.5,1.5);ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.lineTo(end.x,end.y-66);ctx.lineTo(start.x,start.y-66);ctx.closePath();ctx.fillStyle=wall;ctx.fill();ctx.strokeStyle=edge?'#b5a1c0':'#c3b0ce';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(start.x,start.y-66);ctx.lineTo(end.x,end.y-66);ctx.stroke();ctx.strokeStyle='#fff7';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(start.x,start.y-5);ctx.lineTo(end.x,end.y-5);ctx.stroke();}
   // framed star print and two warmly lit windows on the back walls
   for(const k of [4,8]){const pt=p(k,1.5);ctx.save();ctx.translate(pt.x,pt.y-42);ctx.transform(1,.5,0,1,0,0);roundrect(ctx,-18,-16,36,34,5,'#fff4e6');roundrect(ctx,-13,-12,26,26,3,k===4?'#c4dce2':'#eac5ce');ctx.strokeStyle='#fff9';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(0,12);ctx.moveTo(-11,1);ctx.lineTo(11,1);ctx.stroke();ctx.restore();}
   // soft rugs under the furniture
   const rug=p(4.7,5.7);diamond(ctx,rug.x,rug.y,80,40,'#dfc9e180');const lounge=p(8.6,4.9);diamond(ctx,lounge.x,lounge.y,86,43,'#e5ad9c55');
   const decor=this.state.decorations||[];
   if(decor.includes('bunting')){
    const a=p(2.1,1.5),b=p(10.9,1.5);ctx.strokeStyle='#b18ea4';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(a.x,a.y-65);ctx.quadraticCurveTo((a.x+b.x)/2,(a.y+b.y)/2-39,b.x,b.y-65);ctx.stroke();
    for(let i=0;i<10;i++){const q=(i+.5)/10,x=a.x+(b.x-a.x)*q,y=a.y+(b.y-a.y)*q-65+52*q*(1-q);ctx.fillStyle=['#e9a8b7','#f1ce83','#a8c7ba','#b8a2d7'][i%4];ctx.beginPath();ctx.moveTo(x-8,y-1);ctx.lineTo(x+8,y+4);ctx.lineTo(x,y+15);ctx.closePath();ctx.fill();}
   }
   if(decor.includes('lanterns')){
    for(const k of [3,5,7,9]){const pt=p(1.5,k);ctx.strokeStyle='#bd9f89';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(pt.x,pt.y-66);ctx.lineTo(pt.x,pt.y-47);ctx.stroke();
     const glow=ctx.createRadialGradient(pt.x,pt.y-41,2,pt.x,pt.y-41,19);glow.addColorStop(0,'#ffedb36b');glow.addColorStop(1,'#ffedb300');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(pt.x,pt.y-41,19,0,Math.PI*2);ctx.fill();
     roundrect(ctx,pt.x-6,pt.y-48,12,14,5,k%4===1?'#e1b8ce':'#f1d29c');ctx.strokeStyle='#fff2cf';ctx.beginPath();ctx.moveTo(pt.x,pt.y-46);ctx.lineTo(pt.x,pt.y-36);ctx.stroke();}
   }
   if(decor.includes('rainbow')){
    const pt=p(6.8,1.5);ctx.save();ctx.translate(pt.x,pt.y-34);ctx.transform(1,.5,0,1,0,0);roundrect(ctx,-22,-24,44,35,5,'#fff2df');
    ['#dfa0b7','#edc280','#add0b6','#b8a8d7'].forEach((color,i)=>{ctx.beginPath();ctx.arc(0,1,16-i*3.2,Math.PI,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();});ctx.restore();
   }

  }
  drawSky(ctx,now) {
   const w=this.width,h=this.height,t=this.reduced?0:now*.00006;
   const sky=ctx.createLinearGradient(0,0,w*.4,h);sky.addColorStop(0,'#202047');sky.addColorStop(.5,'#44406e');sky.addColorStop(1,'#51728a');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
   // A calm evening skyline and two broad, slowly drifting bands of coloured light.
   // The home remains bright, while the horizon suggests a magical pop-concert city.
   for(const [x,y,size,color]of [[.18,.25,.34,'#db6cba'],[.86,.31,.28,'#72e1db']]){
    const g=ctx.createRadialGradient(w*x,h*y,0,w*x,h*y,w*size);g.addColorStop(0,color+'24');g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
   }
   ctx.save();ctx.globalAlpha=.16;ctx.lineWidth=17;ctx.lineCap='round';ctx.strokeStyle='#9f8aff';ctx.beginPath();ctx.moveTo(-90,h*.24);ctx.bezierCurveTo(w*.25,h*(.36+Math.sin(t)*.015),w*.7,h*.03,w+90,h*.23);ctx.stroke();ctx.lineWidth=7;ctx.strokeStyle='#87f0e4';ctx.beginPath();ctx.moveTo(-80,h*.275);ctx.bezierCurveTo(w*.3,h*.38,w*.73,h*(.09+Math.sin(t*.8)*.01),w+80,h*.27);ctx.stroke();ctx.restore();
   for(let i=0;i<28;i++){
    const x=((i*137.31+63)%997)/997*w,y=((i*61.7+29)%211)/211*h*.63;
    ctx.globalAlpha=.24+(this.reduced?.14:(Math.sin(t*8+i*1.7)+1)*.14);ctx.fillStyle=i%3?'#fff3d7':'#a8eee8';ctx.beginPath();ctx.arc(x,y,i%7===0?1.7:1,0,Math.PI*2);ctx.fill();
   }
   ctx.globalAlpha=1;
   const horizon=h*.84;
   for(let i=0;i<18;i++){
    const bw=Math.max(34,w/23),x=i*w/16-w*.07,bh=h*(.12+((i*7)%9)*.018),y=horizon-bh;
    ctx.fillStyle=i%2?'#2d3b61':'#344466';roundrect(ctx,x,y,bw,bh+80,4,ctx.fillStyle);
    ctx.fillStyle=i%3===0?'#dd8ebf44':'#a7ded742';
    for(let row=0;row<Math.floor(bh/22)-1;row++)for(let col=0;col<3;col++)if((row*3+col+i)%4!==1)ctx.fillRect(x+8+col*(bw-16)/3,y+13+row*19,3.5,7);
    if(i%4===0){ctx.fillStyle='#a38bc277';ctx.fillRect(x+4,y-3,bw-8,2);}
   }
   const haze=ctx.createLinearGradient(0,h*.66,0,h);haze.addColorStop(0,'#7a75a000');haze.addColorStop(1,'#7699a469');ctx.fillStyle=haze;ctx.fillRect(0,h*.66,w,h*.34);
  }
  render(now) {
   const ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.drawSky(ctx,now);
   ctx.save();ctx.translate(this.camera.x,this.camera.y);ctx.scale(this.camera.scale,this.camera.scale);
   ctx.fillStyle='#15152c38';ctx.beginPath();ctx.ellipse(0,330,510,210,0,0,Math.PI*2);ctx.fill();this.cachedFloor(ctx);
   if(this.marker){const {x,y,time}=this.marker,px=(x-y)*HW,py=(x+y)*HH;ctx.strokeStyle='#8f64bd';ctx.lineWidth=3;ctx.globalAlpha=Math.min(1,time*2);ctx.beginPath();ctx.ellipse(px,py,13+(this.reduced?0:Math.sin(now/120)*2),6,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#c9adee';ctx.beginPath();ctx.ellipse(px,py,5,2.5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
   const decor=this.state.decorations||[],displayObjects=objects.slice();
   if(decor.includes('flowerArch'))displayObjects.push({id:'flower_arch',type:'flower_arch',x:12.4,y:4.2});
   const carried=Object.values(this.actors).some(a=>a.holdingBaby),reaction=this.reaction?.kind;
   const items=[...displayObjects.map(o=>({sort:o.x+o.y,object:o})),...Object.values(this.actors).map(a=>({sort:a.x+a.y+.1,actor:a}))].sort((a,b)=>a.sort-b.sort);
   for(const it of items){
    if(it.object){
     const o=it.object;
     global.Art.drawObject(ctx,o.type,{x:(o.x-o.y)*HW,y:(o.x+o.y)*HH,scale:1,time:now,variant:this.state.outfit,
      baby:!carried&&this.state.story>=3&&((o.id==='crib'&&(this.state.babyStage===0||this.state.lastCare==='sleep'))||(o.id==='baby_mat'&&this.state.babyStage>0&&this.state.lastCare!=='sleep')),
      sleeping:this.state.lastCare==='sleep',babyStage:this.state.babyStage,active:this.pending?.id===o.id,
      reducedMotion:this.reduced,reaction,decorations:decor});
    }else{
     const a=it.actor,action=a.action;
     global.Art.drawCharacter(ctx,{x:(a.x-a.y)*HW,y:(a.x+a.y)*HH,scale:.87,role:a.role,facing:a.facing,walk:a.walk,
      moving:a.moving&&!this.reduced,pregnant:a.role===this.state.mother&&this.state.story<3,holdingBaby:a.holdingBaby,
      selected:a.role===this.state.selected,time:now,mood:action?.kind==='sleep'?'calm':'happy',
      action:action?.kind,actionProgress:action?1-action.remaining/action.duration:0,reducedMotion:this.reduced});
    }
   }
   this.drawAmbience(ctx,now);this.drawReaction(ctx,now);ctx.restore();this.updateLabels();
  }
  drawAmbience(ctx,now) {
   if(this.reduced)return;
   // Two small butterflies remain inside the garden and never obscure tap targets.
   for(let i=0;i<2;i++){
    const t=now*.0006+i*3,px=300+Math.sin(t)*46+i*9,py=227+Math.cos(t*.8)*23+i*42,wing=2+Math.abs(Math.sin(now*.018+i))*3;
    ctx.save();ctx.translate(px,py);ctx.rotate(Math.sin(t)*.3);ctx.fillStyle=i?'#d9accb':'#ebc58f';
    ctx.beginPath();ctx.ellipse(-3,-2,wing,3,-.4,0,Math.PI*2);ctx.ellipse(3,-2,wing,3,.4,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ae829b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(0,3);ctx.stroke();ctx.restore();
   }
   // Small garden lights drift close to the flower beds, clear of the interaction pins.
   for(let i=0;i<6;i++){
    const t=now*.00038+i*1.9,x=95+i*34+Math.sin(t)*8,y=390+Math.sin(t*.8+i)*15;
    const g=ctx.createRadialGradient(x,y,0,x,y,7);g.addColorStop(0,i%2?'#ffe5a2b0':'#b7ffe3a0');g.addColorStop(1,'#b7ffe300');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();
   }
  }
  drawReaction(ctx,now) {
   const r=this.reaction;if(!r)return;
   const age=r.duration-r.remaining,alpha=Math.min(1,age*3,r.remaining*1.8),x=(r.x-r.y)*HW,y=(r.x+r.y)*HH;
   if(this.reduced)return;
   ctx.save();ctx.globalAlpha=alpha;
   for(let i=0;i<8;i++){
    const phase=(age*.35+i*.127)%1,px=x+Math.sin(i*2.4+phase)*35,py=y-42-phase*62;
    ctx.globalAlpha=alpha*Math.sin(phase*Math.PI)*.85;
    if(r.kind==='wash'){
     ctx.strokeStyle='#98cacf';ctx.lineWidth=1.3;ctx.fillStyle='#dff3ee77';ctx.beginPath();ctx.arc(px,py,3+(i%3),0,Math.PI*2);ctx.fill();ctx.stroke();
     ctx.fillStyle='#ffffffb5';ctx.beginPath();ctx.arc(px-1,py-1,1,0,Math.PI*2);ctx.fill();
    }else if(r.kind==='feed'||r.kind==='play'){
     ctx.fillStyle=i%2?'#d795b1':'#eeb8ba';ctx.beginPath();ctx.moveTo(px,py+4);ctx.bezierCurveTo(px-10,py-1,px-5,py-8,px,py-4);ctx.bezierCurveTo(px+5,py-8,px+10,py-1,px,py+4);ctx.fill();
    }else if(r.kind==='music'){
     ctx.fillStyle=i%2?'#b99bd3':'#dea0b5';ctx.beginPath();ctx.ellipse(px,py,3,2,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(px+2,py);ctx.lineTo(px+2,py-10);ctx.lineTo(px+6,py-8);ctx.stroke();
    }else{
     ctx.strokeStyle=i%2?'#d1b1df':'#efcc83';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px-3,py);ctx.lineTo(px+3,py);ctx.moveTo(px,py-3);ctx.lineTo(px,py+3);ctx.stroke();
    }
   }
   ctx.restore();
  }
  snapshot(){return{selected:this.state.selected,actors:JSON.parse(JSON.stringify(this.actors)),camera:{...this.camera},paused:this.paused,pending:this.pending?.action??null,reaction:this.reaction?{...this.reaction}:null,elapsed:this.elapsed};}
 }
 global.GameWorld={World,pathfind,nearest,walkable,objects,width:W,height:H};
 if(typeof module!=='undefined'&&module.exports)module.exports=global.GameWorld;
})(typeof window!=='undefined'?window:globalThis);
