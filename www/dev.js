/* Wimeloo Browser Dev Tools 1.2.0. No server, network, or privileged bridge. */
(function () {
  'use strict';
  // The developer console is intentionally unavailable in the Android release.
  if (typeof window.AndroidBridge !== 'undefined') return;
  const params = new URLSearchParams(location.search);
  let enabled = params.get('dev') === '1';
  let gridVisible = true;
  let showHitboxes = true;
  let display = null;
  let layer = null;
  let running = false;
  let frame = 0;
  let prevTime = performance.now();
  let fps = 0;
  const $ = id => document.getElementById(id);
  const source = () => window.Wimeloo || window.Sternenbaby;
  const world = () => source()?.world;
  const state = () => source()?.state?.state || source()?.state?.data || source()?.state;
  function diagnostics() {
    const w = world();
    if (!w) return { status: 'Spielwelt lädt …' };
    const snap = w.snapshot();
    const s = w.state || {};
    return {
      mode:'browser-only', version:'1.2.0', fps:Math.round(fps),
      size:{width:w.width,height:w.height,pixelRatio:w.dpr},
      camera:{x:Math.round(snap.camera.x),y:Math.round(snap.camera.y),zoom:Number(snap.camera.scale.toFixed(3))},
      selected:snap.selected, actors:Object.fromEntries(Object.entries(snap.actors).map(([name,actor])=>[name,{x:+actor.x.toFixed(2),y:+actor.y.toFixed(2),moving:actor.moving,path:actor.path?.length||0}])),
      pending:snap.pending, paused:snap.paused, overlay:source().overlayMode,
      chapter:s.chapter, story:s.story, babyStage:s.babyStage, memoryCount:s.memories?.length||0
    };
  }
  function toggle(on) {
    enabled=!!on;
    if (enabled) create();
    else destroy();
  }
  function makeButton(text,fn) {
    const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);return b;
  }
  function create() {
    if (display) {display.hidden=false;return;}
    display=document.createElement('section');display.className='wimeloo-dev';display.setAttribute('aria-label','Wimeloo Entwicklerwerkzeuge');
    display.innerHTML='<header><strong>WIMELOO · DEV</strong><span>Browser · lokal</span></header><pre id="wm-dev-status" aria-live="off"></pre><div class="wm-dev-buttons"></div><small>Ctrl+Shift+D · ?dev=1 · Keine Telemetrie</small>';
    const buttons=display.querySelector('.wm-dev-buttons');
    buttons.append(
      makeButton('Raster',()=>{gridVisible=!gridVisible;}),
      makeButton('Touch-Ziele',()=>{showHitboxes=!showHitboxes;}),
      makeButton('Kamera 1:1',()=>{world()?.setZoom?.(1);}),
      makeButton('Gesamtansicht',()=>{world()?.resetCamera?.();}),
      makeButton('Test: Musik',()=>{source()?.startGame?.('music');}),
      makeButton('Test: Garten',()=>{source()?.startGame?.('shapes');}),
      makeButton('Test: Pflege',()=>{source()?.showCare?.();}),
      makeButton('JSON kopieren',async()=>{
        const data=JSON.stringify(diagnostics(),null,2);
        try { await navigator.clipboard.writeText(data); } catch (_) { const pane=display.querySelector('pre');pane.textContent=data; }
      }),
      makeButton('Schließen',()=>toggle(false))
    );
    document.body.append(display);
    layer=document.createElement('canvas');layer.className='wimeloo-dev-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
    running=true;requestAnimationFrame(loop);
  }
  function destroy() {
    running=false;display?.remove();layer?.remove();display=null;layer=null;
  }
  function loop(now) {
    if (!running || !enabled || !layer) return;
    frame++;
    if(now-prevTime>=500) {fps=frame*1000/(now-prevTime);frame=0;prevTime=now;}
    const w=world();
    if(w && w.canvas){
      const rect=w.canvas.getBoundingClientRect();
      const dpr=Math.min(devicePixelRatio||1,2);
      const width=Math.max(1,Math.round(rect.width*dpr)),height=Math.max(1,Math.round(rect.height*dpr));
      if (layer.width!==width||layer.height!==height){layer.width=width;layer.height=height;}
      layer.style.left=rect.left+'px';layer.style.top=rect.top+'px';layer.style.width=rect.width+'px';layer.style.height=rect.height+'px';
      const ctx=layer.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
      if(gridVisible){
        ctx.strokeStyle='rgba(93,233,203,.45)';ctx.lineWidth=1;
        for(let x=0;x<=18;x++)for(let y=0;y<=16;y++){
          const p=w.project(x,y),q=w.project(x+1,y),r=w.project(x,y+1);
          ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.moveTo(p.x,p.y);ctx.lineTo(r.x,r.y);ctx.stroke();
        }
      }
      if(showHitboxes){
        for(const entry of w.labels||[]){
          const b=entry.button;if(b.hidden || getComputedStyle(b).visibility==='hidden')continue;
          const box=b.getBoundingClientRect();ctx.strokeStyle='#ffcc50';ctx.lineWidth=2;ctx.strokeRect(box.left-rect.left,box.top-rect.top,box.width,box.height);
        }
      }
    }
    if (display){display.querySelector('pre').textContent=JSON.stringify(diagnostics(),null,2);}
    requestAnimationFrame(loop);
  }
  document.addEventListener('keydown',e=>{
    if (e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='d'){
      e.preventDefault();toggle(!enabled);
    }
  });
  window.WimelooDev={get enabled(){return enabled;},toggle,diagnostics};
  if (enabled) create();
})();
