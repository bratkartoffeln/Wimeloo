/* Sternenbaby — original, resolution-independent Canvas artwork.
 * All coordinates use feet / ground contact as (x,y). scale=1 means an adult
 * height of approximately 90 px. Objects use isometric 2:1 ground axes.
 * This module is deliberately independent of game state and DOM layout.
 */
(function () {
  'use strict';

  const P = Object.freeze({
    ink: '#3b315a', plum: '#7451aa', plumLight: '#aa83d8', plumDark: '#4d3479',
    cream: '#fff8e8', gold: '#f8ca64', rose: '#ec8f9a', roseLight: '#f8b8bb',
    roseDark: '#c76e84', teal: '#5faeaa', tealLight: '#9bd1c4', tealDark: '#377e88',
    wood: '#d6a277', woodLight: '#efd0a4', woodDark: '#af785d',
    skin: '#f3c5ac', skinShade: '#d99d8b', white: '#fffdf7', leaf: '#6eae8e'
  });

  function poly(c, pts, fill, stroke, width) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width || 1; c.stroke(); }
  }
  function ellipse(c, x, y, rx, ry, fill, rotation) {
    c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rotation || 0, 0, Math.PI * 2);
    c.fillStyle = fill; c.fill();
  }
  function round(c, x, y, w, h, r, fill, stroke, width) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width || 1; c.stroke(); }
  }
  function line(c, pts, color, width) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = width; c.strokeStyle = color; c.stroke();
  }
  function bezier(c, points, color, width) {
    c.beginPath(); c.moveTo(points[0], points[1]);
    c.bezierCurveTo(points[2], points[3], points[4], points[5], points[6], points[7]);
    c.lineCap = 'round'; c.strokeStyle = color; c.lineWidth = width; c.stroke();
  }
  function star(c, x, y, r, color, rotation) {
    const pts = [];
    for (let i = 0; i < 10; i++) { const a = (rotation || 0) - Math.PI / 2 + i * Math.PI / 5; const d = i % 2 ? r * .45 : r; pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]); }
    poly(c, pts, color);
  }
  function heart(c, x, y, s, fill) {
    c.beginPath(); c.moveTo(x, y + s * .45);
    c.bezierCurveTo(x - s * 1.2, y - s * .2, x - s * .9, y - s * .95, x, y - s * .5);
    c.bezierCurveTo(x + s * .9, y - s * .95, x + s * 1.2, y - s * .2, x, y + s * .45);
    c.fillStyle = fill; c.fill();
  }
  function iso(x, y, z) { return [x - y, (x + y) * .5 - (z || 0)]; }
  function box(c, x, y, w, d, h, colors, z) {
    z = z || 0;
    const a = iso(x - w / 2, y - d / 2, z + h), b = iso(x + w / 2, y - d / 2, z + h),
      f = iso(x + w / 2, y + d / 2, z + h), e = iso(x - w / 2, y + d / 2, z + h),
      bb = iso(x + w / 2, y - d / 2, z), ff = iso(x + w / 2, y + d / 2, z), ee = iso(x - w / 2, y + d / 2, z);
    poly(c, [b, bb, ff, f], colors.right || colors.side || P.woodDark);
    poly(c, [e, f, ff, ee], colors.left || colors.side || P.wood);
    poly(c, [a, b, f, e], colors.top || P.woodLight);
    return { a, b, f, e, bb, ff, ee };
  }
  function shadow(c, rx, ry, alpha) { ellipse(c, 0, 1, rx, ry, 'rgba(65,48,78,' + (alpha == null ? .13 : alpha) + ')'); }
  function projectedLine(c, a, b, color, width) { line(c, [iso(a[0], a[1], a[2]), iso(b[0], b[1], b[2])], color, width); }
  function sparkle(c, x, y, s, color) {
    poly(c, [[x, y - s], [x + s * .3, y - s * .25], [x + s, y], [x + s * .3, y + s * .25], [x, y + s], [x - s * .3, y + s * .25], [x - s, y], [x - s * .3, y - s * .25]], color);
  }

  // A single joint rig owns both arms. Props and babies never draw an adult arm.
  // This makes carrying + an action a pose choice rather than an extra layer of limbs.
  function characterPose(o) {
    o=o||{};const reduced=!!o.reducedMotion,t=reduced?0:(o.time||0)*.001;
    const action=o.action||'',walk=o.moving&&!reduced?Math.sin((o.walk||0)*Math.PI*2):0;
    const dancing=['music','celebrate'].includes(action),beat=reduced?0:Math.sin(t*6.1);
    const active=o.actionProgress==null?1:Math.max(.18,Math.min(1,o.actionProgress*6,(1-o.actionProgress)*6));
    const holding=!!o.holdingBaby||action==='feed';
    const arms=[{side:'left',shoulder:[-14,-63],elbow:[-20,-48+walk*5],hand:[-18,-34+walk*7]},
      {side:'right',shoulder:[14,-63],elbow:[20,-48-walk*5],hand:[19,-34-walk*7]}];
    let prop=null;
    if(holding){
      arms[0].elbow=[-20,-43];arms[0].hand=[7,-31];
      const fp=o.feedProgress==null?1:Math.max(0,Math.min(1,o.feedProgress));
      arms[1].elbow=[25,-47];arms[1].hand=action==='feed'?[30-8*fp,-31-17*fp+Math.sin(t*2)*.5]:[18,-29];
      if(action==='feed')prop='bottle';
    }else if(action==='wash'||action==='fresh'){
      const rub=reduced?0:Math.sin(t*8)*3;
      arms[0].elbow=[-20,-47];arms[0].hand=[1+rub,-42];
      arms[1].elbow=[22,-47];arms[1].hand=[5-rub,-40];
    }else if(action==='wave'){
      arms[1].elbow=[25,-69];arms[1].hand=[27+beat*4*active,-86];
    }else if(dancing){
      arms[0].elbow=[-26,-53-beat*9*active];arms[0].hand=[-28,-71-beat*12*active];
      arms[1].elbow=[26,-59+beat*6*active];arms[1].hand=[31,-80+beat*13*active];
      if(action==='music')prop='microphone';
    }else if(action==='play'){
      arms[0].elbow=[-22,-51];arms[0].hand=[-17,-68+beat*5];
      arms[1].elbow=[24,-51];arms[1].hand=[31,-61+beat*6];prop='rattle';
    }else if(action==='sleep'){
      arms[0].elbow=[-20,-48];arms[0].hand=[-1,-39];
      arms[1].elbow=[22,-49];arms[1].hand=[5,-40];
    }else if(o.pregnant&&!o.moving){
      arms[0].elbow=[-21,-47];arms[0].hand=[-2,-37];
      arms[1].elbow=[25,-46];arms[1].hand=[14,-32];
    }
    if((o.facing||'se')[0]==='n'&&holding){
      arms[0].elbow=[-20,-47];arms[0].hand=[-3,-41];
      arms[1].elbow=[27,-48];arms[1].hand=[22,-30];
    }
    const legs=[{hip:[-7,-32],knee:[-8-walk*3,-18],foot:[-9-walk*4,-4-Math.max(0,walk)*4]},
      {hip:[7,-32],knee:[9+walk*3,-18],foot:[10+walk*4,-4-Math.max(0,-walk)*4]}];
    if(dancing){legs[0].knee[0]-=beat*3;legs[0].foot[0]-=beat*5;legs[1].knee[0]-=beat*3;legs[1].foot[1]-=Math.max(0,beat)*3;}
    return {arms,legs,holding,prop,walk,t,beat,action,back:(o.facing||'se')[0]==='n',flip:(o.facing||'se')[1]==='w'?-1:1,
      bob:o.moving?Math.abs(walk)*1.7:dancing?Math.abs(beat)*3:Math.sin(t*1.9)*.45,
      sway:dancing?beat*.065:holding?Math.sin(t*1.8)*.018:0};
  }

  function drawBaby(c,x,y,scale,sleeping,blanket,options) {
    const o=options||{},t=o.reducedMotion?0:(o.time||0)*.001,stage=Math.max(0,Math.min(2,o.stage||0));
    const happy=['play','celebrate','music'].includes(o.reaction),beat=Math.sin(t*(happy?5.5:2.5));
    const blink=!sleeping&&!o.reducedMotion&&t%5.1>4.94,color=blanket||'#bba8ef';
    c.save();c.translate(x,y);c.scale(scale,scale);
    if(o.lying){
      ellipse(c,4,6,20,10,color,-.08);
      c.beginPath();c.moveTo(-10,-2);c.quadraticCurveTo(5,5,21,1);c.quadraticCurveTo(19,18,-4,14);c.closePath();c.fillStyle='#ddd7ff';c.fill();
      line(c,[[-6,0],[10,12]],'rgba(113,83,167,.22)',1);star(c,9,5,3.4,'#fff7d5');
      if(!o.tuckedArms&&!sleeping){line(c,[[-6,0],[-9,-5],[-8,-9-beat]],P.skin,3);line(c,[[-7,8],[-10,14],[-6,16+beat]],P.skin,3);}
      line(c,[[-14,-1],[-7,3]],P.skin,5);c.translate(-14,3);
    }else if(stage===2&&!sleeping){
      ellipse(c,3,14,21,4,'rgba(32,23,58,.12)');
      ellipse(c,7,0,14,10,color,-.14);
      line(c,[[12,5],[16,9],[20+beat*2,12]],color,7);ellipse(c,21+beat*2,12,3.5,2.5,P.skin);
      line(c,[[3,6],[0,11],[-4-beat*2,12]],color,7);ellipse(c,-5-beat*2,12,3,2.5,P.skin);
      line(c,[[-5,-1],[-12,7],[-13-beat,13]],P.skin,4.5);
      line(c,[[0,0],[-2,8],[1+beat,14]],P.skin,4.5);
      star(c,10,-1,3.5,'#fff6cd');c.translate(-10,-6+Math.abs(beat)*.7);
    }else if(stage===1&&!sleeping){
      ellipse(c,0,15,19,4,'rgba(32,23,58,.12)');
      ellipse(c,0,3,11.5,13,color);
      line(c,[[-5,10],[-10,15],[-16,14+beat]],color,7);ellipse(c,-17,14+beat,3.8,2.7,P.skin);
      line(c,[[5,10],[10,15],[16,14-beat]],color,7);ellipse(c,17,14-beat,3.8,2.7,P.skin);
      if(!o.tuckedArms){line(c,[[-8,-2],[-14,1],[-18,-5-beat*3]],P.skin,4.5);line(c,[[8,-2],[15,-1],[18,-6+beat*3]],P.skin,4.5);}
      star(c,0,5,4,'#fff6cd');c.translate(0,-5);
    }else{
      c.save();c.scale(1,1+Math.sin(t*1.7)*.015);
      ellipse(c,0,4,10.8,17.5,color,-.05);
      c.beginPath();c.moveTo(-9,-2);c.quadraticCurveTo(4,7,9,2);c.lineTo(5,18);c.quadraticCurveTo(-10,16,-9,-2);c.fillStyle='#ddd7ff';c.fill();
      line(c,[[-7,0],[6,7]],'rgba(113,83,167,.22)',1);star(c,0,8,3.2,'#fff7d5');c.restore();
      if(!sleeping&&!o.tuckedArms){line(c,[[-7,-2],[-11,0],[-12,-4-beat]],P.skin,3);line(c,[[7,-2],[11,0],[12,-3+beat]],P.skin,3);}
    }
    ellipse(c,-9,-10,2.5,3,P.skin);ellipse(c,9,-10,2.5,3,P.skin);
    const g=c.createLinearGradient(-7,-19,8,-1);g.addColorStop(0,'#ffddc0');g.addColorStop(1,'#efb9a2');ellipse(c,0,-10,10,10,g);
    ellipse(c,-5,-7,2,1.2,'#eb9bac');ellipse(c,5,-7,2,1.2,'#eb9bac');
    if(sleeping||blink){bezier(c,[-5.5,-10,-4,-8.5,-2.5,-8.5,-1.5,-10],P.ink,1);bezier(c,[1.5,-10,3,-8.5,4.5,-8.5,5.5,-10],P.ink,1);}
    else{ellipse(c,-3.7,-10,1.25,1.9,'#42314e');ellipse(c,3.7,-10,1.25,1.9,'#42314e');ellipse(c,-3.4,-10.7,.4,.6,P.white);ellipse(c,4,-10.7,.4,.6,P.white);}
    if(happy&&!sleeping){ellipse(c,.2,-4.4,2.5,2.2,'#a35672');ellipse(c,.2,-3.4,1.5,.7,'#ef9eac');}
    else bezier(c,[-1.8,-4.8,-.7,-3.7,1,-3.7,2,-4.8],'#a35672',1);
    bezier(c,[-4,-18,-2,-22,4,-22,3,-17],'#654057',1.8);
    c.restore();
  }

  function drawProp(c,type,x,y,scale,rotation,color){
    c.save();c.translate(x,y);c.rotate(rotation||0);c.scale(scale||1,scale||1);
    if(type==='bottle'){
      round(c,-5,-8,10,18,3,'#ecfcff','#6b6c96',.9);round(c,-4,-3,8,12,2,'#fff7d9');
      round(c,-5,-10,10,4,1.5,color||'#a6dae0');round(c,-2,-14,4,5,1.8,'#efba9e');
      for(let j=0;j<3;j++)line(c,[[1,-1+j*3],[3,-1+j*3]],'#a5bdc8',.7);
    }else if(type==='rattle'){
      line(c,[[0,0],[0,13]],'#ffd363',4);ellipse(c,0,-3,8,8,color||'#b590ec');ellipse(c,0,-3,5.6,5.6,'#f4eaff');star(c,0,-3,3,'#e3ae45');
      ellipse(c,0,15,3.5,3,'#e78fb3');
    }else if(type==='microphone'){
      line(c,[[0,0],[0,12]],'#3b315a',4.5);ellipse(c,0,-3,5,6,'#bfc5f0');line(c,[[-3,-4],[3,-4]],'#777baf',1);line(c,[[-3,-1],[3,-1]],'#777baf',1);round(c,-2,5,4,3,1,'#d49bfa');
    }else if(type==='cloth'||type==='blanket'){
      round(c,-17,-12,34,26,6,color||'#c7aff1','#8b6bb9',.8);line(c,[[-12,-8],[12,-8],[12,9]],'#f4ecff',1.4);star(c,0,0,5,'#fff0ba');
    }else if(type==='nappy'){
      poly(c,[[-14,-10],[14,-10],[11,3],[5,11],[-5,11],[-11,3]],'#fffaf2','#b9b2d7',1);round(c,-12,-7,8,6,2,'#a6d4de');round(c,4,-7,8,6,2,'#a6d4de');star(c,0,2,3.5,'#e2be58');
    }else if(type==='shirt'){
      poly(c,[[-8,-12],[-18,-5],[-12,2],[-7,-1],[-7,14],[9,14],[9,-1],[14,2],[20,-5],[10,-12],[6,-7],[-3,-7]],color||'#ac91ea','#66528c',1);star(c,1,3,5,'#fff3c2');
    }else if(type==='ball'){
      ellipse(c,0,0,13,13,color||'#87d5dc');c.save();c.beginPath();c.arc(0,0,13,0,Math.PI*2);c.clip();line(c,[[-14,-4],[14,9]],'#ffe1a2',6);line(c,[[-6,-14],[6,14]],'#e99fc7',5);c.restore();ellipse(c,-4,-5,3,2,'rgba(255,255,255,.65)',-.5);
    }
    c.restore();
  }

  function drawCharacter(c,o){
    o=o||{};const p=characterPose(o),role=o.role||'rumi',t=p.t,back=p.back;
    const colors=role==='rumi'?{hair:'#9a63df',dark:'#653ab4',light:'#d7a1ff',coat:'#ffd057',shade:'#d89130',trim:'#fff0a5',pants:'#353358',accent:'#a2dce7'}:
      role==='mira'?{hair:'#ec628f',dark:'#a72f67',light:'#ffb0b9',coat:'#352b50',shade:'#221d37',trim:'#e9dcff',pants:'#34233f',accent:'#e78bd3'}:
      {hair:'#292745',dark:'#15182e',light:'#66658a',coat:'#81ddd0',shade:'#329b9f',trim:'#e4f48e',pants:'#5e3b8f',accent:'#ed97e0'};
    const blink=!o.reducedMotion&&(t+(role==='mira'?1.3:role==='zoey'?2.8:0))%4.7>4.53;
    const hairSway=p.walk*3+Math.sin(t*2.7)*.9+p.beat*(p.action==='music'?2:0);
    c.save();c.translate(o.x||0,o.y||0);c.scale(o.scale==null?1:o.scale,o.scale==null?1:o.scale);
    shadow(c,19,6,.17);
    if(o.selected){c.beginPath();c.ellipse(0,0,25,10,0,0,Math.PI*2);c.strokeStyle='#bc86f1';c.lineWidth=2.5;c.stroke();c.beginPath();c.ellipse(0,0,22,8,0,0,Math.PI);c.strokeStyle='#ffe39b';c.lineWidth=1.4;c.stroke();}
    c.scale(p.flip,1);c.translate(0,-p.bob);c.rotate(p.sway);
    // Long hair is behind the skeleton and has a continuous, recognisable contour.
    ellipse(c,0,-84,17.8,20,colors.dark);
    if(role==='rumi'){
      bezier(c,[-9,-99,-27,-91,-22+hairSway,-61,-18+hairSway,-30],colors.dark,11);
      for(let i=0;i<10;i++){const px=-20+Math.sin(i*.58)*2+hairSway*i/10,py=-86+i*6;ellipse(c,px,py,5.4-i*.22,5.1,colors.hair,i%2?.5:-.5);line(c,[[px-2,py-2],[px+1,py+1]],colors.light,1);}
      line(c,[[-18+hairSway,-30],[-19+hairSway,-22]],colors.hair,4);round(c,-22+hairSway,-32,8,3,1,'#ffe8a2');
    }else if(role==='mira'){
      for(const side of [-1,1]){const sx=side*12;c.beginPath();c.moveTo(sx,-99);c.bezierCurveTo(sx+side*16,-98,sx+side*18+hairSway,-58,sx+side*10+hairSway,-33);c.quadraticCurveTo(sx+side*2+hairSway,-43,sx+side*1,-83);c.closePath();c.fillStyle=colors.hair;c.fill();bezier(c,[sx,-94,sx+side*13,-79,sx+side*12+hairSway,-49,sx+side*9+hairSway,-39],colors.light,1.9);}
    }else{
      for(const s of [-1,1]){ellipse(c,s*14,-101,8.5,8.5,colors.dark);ellipse(c,s*15,-103,5.5,5.4,colors.hair);line(c,[[s*20,-98],[s*11,-96]],colors.trim,2);}
    }
    // Two legs are drawn from hip to knee to foot once each.
    for(let i=0;i<2;i++){const leg=p.legs[i],k=leg.knee,f=leg.foot;line(c,[leg.hip,k,f],colors.pants,8);if(role==='mira')line(c,[[k[0],k[1]+2],[f[0],f[1]]],'#242039',8.5);round(c,f[0]-5,f[1]-5,14,7,2.5,role==='rumi'?'#f5f0ff':role==='zoey'?'#f4fff4':'#313047');line(c,[[f[0]-4,f[1]+1],[f[0]+8,f[1]+1]],colors.accent,1.7);line(c,[[f[0]-2,f[1]-3],[f[0]+2,f[1]-3]],role==='mira'?'#cbc4ea':'#a7a0c3',1);}
    function arm(a){
      // Exactly one upper arm, one forearm and one hand for this joint record.
      const fore=[a.elbow[0]+(a.hand[0]-a.elbow[0])*.68,a.elbow[1]+(a.hand[1]-a.elbow[1])*.68];
      line(c,[a.shoulder,a.elbow,fore],colors.shade,7.8);line(c,[[a.shoulder[0]-.8,a.shoulder[1]-1],a.elbow,fore],colors.coat,6.3);
      line(c,[fore,a.hand],P.skin,5.1);ellipse(c,a.hand[0],a.hand[1],3.1,3.7,P.skin,-.25);
      line(c,[[fore[0]-2,fore[1]],[fore[0]+2,fore[1]]],colors.trim,1.2);
    }
    // Far arm behind the torso. Care poses keep forearms visible in front.
    const inFront=!back&&(p.holding||['wash','fresh','sleep'].includes(p.action)||o.pregnant);
    if(back&&p.holding)drawBaby(c,20,-46,1.03,p.action==='sleep'||o.mood==='calm','#b9b3f2',{time:o.time,reaction:p.action,tuckedArms:true,reducedMotion:o.reducedMotion});
    if(!inFront)arm(p.arms[0]);
    if(back)arm(p.arms[1]);
    // Tailored silhouette, high contrast stage details and a covered soft belly.
    poly(c,[[-13,-66],[12,-66],[17,-49],[13,-31],[-12,-31],[-16,-49]],colors.shade);
    round(c,-10,-64,23,34,6,back?colors.coat:'#f6efff');
    if(o.pregnant){ellipse(c,7,-42,16,15,back?colors.shade:'#eee5ff');if(!back)ellipse(c,10,-44,11.5,11.5,'#fff5ef');}
    if(back){star(c,1,-49,8,colors.trim);star(c,1,-49,4.2,colors.accent);line(c,[[-10,-34],[11,-34]],colors.trim,1.4);}
    else{
      poly(c,[[-14,-65],[-6,-66],[-5,-53],[-8,-38],[-14,-36],[-16,-52]],colors.coat);
      poly(c,[[6,-66],[13,-64],[17,-49],[13,-36],[8,-38],[8,-53]],colors.coat);
      line(c,[[-5,-62],[-7,-44]],colors.trim,1.3);line(c,[[7,-62],[10,-44]],colors.trim,1.2);
      if(role==='mira'){line(c,[[-7,-48],[7,-48]],'#d6c8e8',1.1);for(let i=0;i<4;i++)ellipse(c,-10+i*2,-59,1,.8,'#eee1ff');}
      else if(role==='zoey'){poly(c,[[-15,-62],[-8,-64],[-9,-56],[-15,-53]],'#dced75');poly(c,[[10,-56],[16,-53],[15,-46],[10,-49]],'#dced75');}
      else{star(c,-11,-58,3.2,'#fff6d4');line(c,[[10,-55],[14,-54]],'#e89b44',1.4);}
      line(c,[[-9,-32],[12,-32]],'#3f325a',3.2);round(c,-1,-34,5,4,1,'#eac767');
      // Small traditional-jewellery inspired tassel, separated from hands.
      line(c,[[13,-33],[15,-27]],'#f3d894',1);ellipse(c,15,-27,2.3,2.3,colors.accent);line(c,[[15,-25],[16+Math.sin(t*2)*.7,-19]],colors.accent,2);
    }
    round(c,-3.8,-74,8,11,3,P.skinShade);line(c,[[-4,-68],[4,-68]],'#edca8a',1.4);
    // The head turns slightly with gaze; all features share that transform.
    c.save();c.translate(Math.sin(t*.9)*.3,0);
    if(!back){
      ellipse(c,-14.8,-84,2.5,4,P.skin);ellipse(c,15.2,-84,2.5,4,P.skin);
      const face=c.createLinearGradient(-10,-100,10,-68);face.addColorStop(0,'#ffddbe');face.addColorStop(1,'#edb49e');
      c.beginPath();c.moveTo(-14,-90);c.bezierCurveTo(-16,-70,-6,-67,2,-67);c.bezierCurveTo(12,-68,17,-78,15,-90);c.bezierCurveTo(13,-106,-13,-105,-14,-90);c.fillStyle=face;c.fill();
      ellipse(c,-7,-79,3,1.5,'rgba(231,129,151,.4)');ellipse(c,9,-79,2.7,1.5,'rgba(231,129,151,.4)');
      if(blink||p.action==='sleep'){
        bezier(c,[-9,-85,-7,-82,-4,-82,-2,-85],P.ink,1.5);bezier(c,[5,-85,7,-82,10,-82,12,-85],P.ink,1.4);
      }else{
        // Almond-shaped anime eyes stay legible even when zoomed out.
        ellipse(c,-5.3,-85,3.3,3.5,'#fff9f3');ellipse(c,8,-85,3,3.4,'#fff9f3');
        ellipse(c,-4.8,-84.7,1.8,3,'#61426c');ellipse(c,8.4,-84.7,1.7,2.9,'#61426c');
        ellipse(c,-4.6,-84.8,.9,2.1,'#241e3e');ellipse(c,8.6,-84.8,.9,2,'#241e3e');
        ellipse(c,-4,-86,.7,.9,P.white);ellipse(c,9.1,-86,.65,.8,P.white);
        bezier(c,[-9,-86,-7,-89,-4,-89,-2,-86],P.ink,1.4);bezier(c,[5,-86,7,-88.5,10,-88.5,12,-86],P.ink,1.3);
        line(c,[[-9,-86],[-11,-88]],P.ink,1);line(c,[[12,-86],[14,-88]],P.ink,1);
      }
      bezier(c,[-10,-92,-7,-94,-4,-94,-1,-93],colors.dark,1.2);bezier(c,[5,-93,8,-94,11,-93,12,-92],colors.dark,1.2);
      bezier(c,[2.5,-84,2,-80,4,-79,5,-80],'#cc8c86',.9);
      if(['play','celebrate','music'].includes(p.action)){ellipse(c,2.5,-74,3.8,2.6,'#a25173');line(c,[[-.2,-75.2],[4.7,-75.2]],'#fff9f0',1.3);}
      else bezier(c,[-1,-74,1,-71,5,-71,7,-74],'#ab5674',1.3);
      ellipse(c,15.8,-78.5,1.4,2.7,'#f1cf73');
    }
    // Different fringes avoid a recoloured generic doll.
    if(role==='rumi'){
      c.beginPath();c.moveTo(-16,-82);c.bezierCurveTo(-24,-104,2,-112,16,-97);c.quadraticCurveTo(7,-98,1,-93);c.quadraticCurveTo(-6,-89,-11,-91);c.lineTo(-16,-82);c.fillStyle=colors.hair;c.fill();bezier(c,[-13,-98,-3,-106,8,-102,12,-98],colors.light,2.2);
    }else if(role==='mira'){
      c.beginPath();c.moveTo(-16,-78);c.lineTo(-16,-95);c.bezierCurveTo(-11,-108,10,-107,16,-96);c.lineTo(16,-80);c.lineTo(11,-87);c.lineTo(9,-97);c.quadraticCurveTo(-4,-91,-12,-91);c.lineTo(-16,-78);c.fillStyle=colors.hair;c.fill();bezier(c,[-12,-98,-5,-103,5,-103,11,-98],colors.light,2);
    }else{
      c.beginPath();c.moveTo(-16,-81);c.bezierCurveTo(-20,-106,6,-108,17,-95);c.lineTo(16,-80);c.lineTo(12,-87);c.lineTo(9,-93);c.lineTo(5,-90);c.lineTo(0,-93);c.lineTo(-4,-90);c.lineTo(-10,-94);c.lineTo(-16,-81);c.fillStyle=colors.hair;c.fill();bezier(c,[-11,-99,-2,-104,7,-102,12,-97],colors.light,1.8);star(c,-14,-92,2.7,colors.trim);
    }
    if(back){ellipse(c,0,-84,15.8,17,colors.hair);bezier(c,[-10,-97,-9,-84,-5,-75,2,-71],colors.light,1.6);}
    c.restore();
    if(inFront)arm(p.arms[0]);
    if(p.holding&&!back){drawBaby(c,10,-43,1.03,p.action==='sleep'||o.mood==='calm','#b9b3f2',{time:o.time,reaction:p.action,tuckedArms:true,reducedMotion:o.reducedMotion});}
    if(!back)arm(p.arms[1]);
    const hand=p.arms[1].hand;
    if(p.prop&&!back)drawProp(c,p.prop,hand[0],hand[1]-2,p.prop==='microphone'?.8:.65,p.prop==='bottle'?-.85:p.prop==='rattle'?p.beat*.2:-.25,colors.accent);
    if(p.action==='wash'&&!o.reducedMotion){for(let i=0;i<4;i++){const phase=(t*.6+i*.23)%1;ellipse(c,-2+i*4,-44-phase*8,1.8+phase,1.8+phase,'rgba(195,241,255,'+(1-phase)*.8+')');}}
    c.restore();
  }

  // A generous stage for direct manipulation: the child sees the action itself.
  // step is 0..2; progress is the completed portion of that individual action.
  function drawCareScene(c,o){
    o=o||{};const w=o.width||900,h=o.height||340,type=o.type||'play',step=Math.max(0,Math.min(2,o.step||0));
    const p=Math.max(0,Math.min(1,o.progress||0)),t=o.reducedMotion?0:(o.time||0)*.001,active=o.active!==false;
    const scale=Math.min(w/900,h/340),role=o.role||'rumi',blanket=o.blanket||'#baa6ed';
    const calm=type==='sleep',dim=calm?(step===0?p:.9):0,wiggle=o.reducedMotion||!active?0:Math.sin(t*5);
    c.save();c.translate((o.x||0)+(w-scale*900)/2,(o.y||0)+(h-scale*340)/2);c.scale(scale,scale);
    const g=c.createLinearGradient(0,0,900,340);g.addColorStop(0,calm?'#dcd6f4':'#e9e0ff');g.addColorStop(.55,'#f7eaff');g.addColorStop(1,'#d8f1f2');
    round(c,0,0,900,340,28,g);c.save();round(c,0,0,900,340,28);c.clip();
    // Rounded city-view window and a warm, readable foreground.
    round(c,44,27,190,172,25,'#b5a8e5','#fff8ff',7);
    const sky=c.createLinearGradient(0,36,0,190);sky.addColorStop(0,'#ada7e9');sky.addColorStop(1,'#f6c6da');round(c,54,37,170,152,19,sky);
    for(let i=0;i<9;i++){const hh=23+(i*17)%49;round(c,55+i*20,186-hh,18,hh,2,['#b0a3d3','#9e99cc','#b9acd8'][i%3]);for(let j=0;j<3;j++)round(c,59+i*20,180-hh+j*12,3,4,1,'#ffe7b5');}
    line(c,[[139,34],[139,193]],'#fff6ff',5);ellipse(c,188,67,13,13,'#fff2c8');
    poly(c,[[0,265],[900,240],[900,340],[0,340]],'#eee0eb');line(c,[[0,265],[900,240]],'#cfbfdc',2);
    for(let i=0;i<4;i++)line(c,[[i*250,340],[i*240+90,260]],'rgba(190,157,189,.2)',1);
    // Hanging coloured glass, with slight pendulum movement instead of flashing.
    for(let i=0;i<3;i++){const x=375+i*70,swing=o.reducedMotion?0:Math.sin(t*1.2+i)*2;line(c,[[x,0],[x+swing,39+i*8]],'#ac91c5',1.5);ellipse(c,x+swing,47+i*8,10,13,['#d8b1ef','#eeb9ca','#a7d9d9'][i]);ellipse(c,x+swing-3,43+i*8,2,5,'rgba(255,255,255,.4)');}
    // Every scene has one caregiver, one baby and real objects with stable places.
    const base={role,facing:'se',time:o.time||0,reducedMotion:o.reducedMotion,actionProgress:.5};
    const bx=665,by=235,bs=3.15;
    function mat(){ellipse(c,bx,276,126,42,'rgba(120,91,145,.13)');ellipse(c,bx,266,125,39,'#cbb5e7');ellipse(c,bx,263,112,31,'#e9d8f5');for(let i=0;i<7;i++)star(c,bx-83+i*28,267+(i%2)*8,4.5,['#b89ad7','#f7c7d7','#badada'][i%3]);}
    function baby(opts){drawBaby(c,bx,by,bs,!!opts?.sleeping,opts?.color||blanket,{time:o.time||0,stage:o.stage||0,lying:!o.stage,tuckedArms:!o.stage,reducedMotion:o.reducedMotion,reaction:opts?.reaction||'',...opts});}
    function adult(action,extra){drawCharacter(c,{...base,x:320,y:323,scale:2.2,action,...extra});}
    function bed(){round(c,535,253,260,39,17,'#a38ac2');round(c,541,231,248,37,17,'#ddc5ef');round(c,552,222,226,35,18,'#fff2f9');round(c,535,281,15,35,5,'#88739d');round(c,780,281,15,35,5,'#88739d');round(c,525,155,17,138,7,'#bda1d3');round(c,789,155,17,138,7,'#bda1d3');ellipse(c,533,155,13,11,'#e1bce6');ellipse(c,797,155,13,11,'#e1bce6');}
    if(type==='feed'){
      if(step===0){
        mat();baby({});adult('wash');
        // Actual tap, basin, water stream and rubbing hands.
        round(c,265,261,110,13,5,'#86b6ce');round(c,275,273,13,45,4,'#8d7da7');round(c,353,273,13,45,4,'#8d7da7');
        ellipse(c,320,253,63,21,'#b3d8e4');ellipse(c,320,249,54,15,'#eefaff');ellipse(c,320,253,41,10,'#91bfd5');
        bezier(c,[359,249,358,221,346,213,334,226],'#98a2bf',7);line(c,[[332,225],[340,225]],'#dbe6f4',4);
        if(p>0){for(let i=0;i<5;i++){const yy=231+((t*35+i*6)%25);line(c,[[336+(i%2),yy],[336+(i%2),yy+4]],'#74c7e4',1.6);}for(let i=0;i<7;i++)ellipse(c,300+i*7,243-Math.sin(t*3+i)*4,3+i%2,3+i%2,'rgba(239,253,255,.85)');}
        drawProp(c,'bottle',759,244,1.5,-.15);drawProp(c,'cloth',787,277,1.3,0,'#fff2cb');
      }else{
        mat();
        drawCharacter(c,{...base,x:612,y:323,scale:2.48,action:step===1?'feed':'sleep',holdingBaby:true,feedProgress:p,mood:step===2?'calm':'happy'});
        // Milk travelling visibly toward the teat explains the cause and effect.
        if(step===1&&p>.3){for(let i=0;i<3;i++){const phase=(t*.7+i*.31)%1;ellipse(c,668-phase*18,194-phase*8,1.7,1.7,'#fff7d8');}}
        if(step===2&&p>0){for(let i=0;i<3;i++){const phase=(t*.35+i*.3)%1;c.save();c.globalAlpha=(1-phase)*.7;heart(c,672+phase*20,172-phase*27,5,'#e69cc9');c.restore();}}
        round(c,253,239,110,22,9,'#b8a3d3');round(c,267,259,8,63,3,'#947aa9');round(c,342,259,8,63,3,'#947aa9');drawProp(c,'cloth',296,225,1.6,0,'#fff0c5');drawProp(c,'rattle',342,212,1.2,-.4);
      }
    }else if(type==='fresh'){
      mat();adult(step===1?'wash':'wave');
      const colors=['#baa6ed','#8fcfd6','#f0ca85','#e4a5c9'],newColor=blanket;
      baby({color:step===2&&p>.65?newColor:blanket,tuckedArms:step===1});
      round(c,416,262,104,17,7,'#b9a1d0');round(c,425,279,8,42,3,'#a088bb');round(c,503,279,8,42,3,'#a088bb');
      const props=['cloth','nappy','shirt'];
      for(let i=0;i<3;i++){
        if(step===1&&i===0||step===2&&i===2)continue;
        const phase=step===0?(Array.isArray(o.supplyProgress)?o.supplyProgress[i]:Math.max(0,Math.min(1,p*3-i))):1;
        const start={x:410+i*80,y:290},end={x:580+i*83,y:304};
        const px=start.x+(end.x-start.x)*phase,py=start.y+(end.y-start.y)*phase-Math.sin(phase*Math.PI)*40;
        drawProp(c,props[i],px,py,1.32,step===0?(1-phase)*.16:0,i===2?newColor:undefined);
      }
      if(step===1){const sweep=active&&!o.reducedMotion?Math.sin(t*6):0;drawProp(c,'cloth',bx-27+55*p+(p>0&&p<1?sweep*7:0),by+9,1.65,-.08, '#fbf6e9');if(p>0)for(let i=0;i<4;i++)sparkle(c,bx-34+i*23,by-28+(i%2)*20,3,'#fff7ce');}
      if(step===2&&p<.92){drawProp(c,'shirt',740+(bx-740)*p,303+(by+9-303)*p-Math.sin(p*Math.PI)*30,1.5+p*.3,-.1*(1-p),newColor);}
    }else if(type==='play'){
      mat();adult(step===2?'celebrate':step===0?'play':'wave');baby({reaction:p>.4||step===2?'play':''});
      if(step===0){const swing=active&&!o.reducedMotion?Math.sin(t*7)*.28:0;drawProp(c,'rattle',bx+58+wiggle*10*p,by-35,2.3,-.2+swing*p);if(p>0){line(c,[[748,172],[756,168]],'#bd94de',2);line(c,[[751,181],[763,181]],'#bd94de',2);}}
      if(step===1){const lift=p*118,side=Math.sin(p*Math.PI)*28;drawProp(c,'cloth',bx-30+side,by-24-lift,3.5,-p*.18,'#d1b1ed');}
      if(step===2){
        // A feather traces the baby's tummy; the response is a real face/limb pose.
        const xx=bx+37-25*p+wiggle*6*p,yy=by+9+Math.sin(t*4)*4*p;
        bezier(c,[xx+22,yy+24,xx+10,yy+6,xx+4,yy,xx-6,yy-14],'#c18acb',2);
        for(let i=0;i<5;i++){ellipse(c,xx+6-i*2,yy+3-i*4,4,10,'#e9b4dd',-.7);ellipse(c,xx-2-i*2,yy-i*4,4,9,'#cdb2ef',.7);}
        if(p>.3){heart(c,bx-53,by-64+Math.sin(t*3)*4,8,'#e9a0c4');heart(c,bx+58,by-73+Math.sin(t*3+1)*4,6,'#d1a0ed');}
      }
      drawProp(c,'ball',498,289,1.7,0);drawProp(c,'rattle',755,286,1.2,.7);
    }else if(type==='sleep'){
      bed();adult('sleep');baby({sleeping:step>0||p>.75,tuckedArms:true,lying:true});
      // The lamp visibly goes dark as the slider/gesture is completed.
      round(c,826,253,8,62,3,'#9381b3');line(c,[[830,255],[830,114]],'#ad8fc5',5);ellipse(c,830,315,29,9,'#ad8fc5');
      c.save();c.globalAlpha=.75*(1-dim*.85);poly(c,[[795,113],[865,113],[900,270],[753,270]],'#fff4c6');c.restore();
      poly(c,[[811,73],[850,73],[867,115],[793,115]],dim>.6?'#b5a8c7':'#ffe5a3');ellipse(c,830,116,37,8,dim>.6?'#978bae':'#fff2bd');
      if(step>=1){
        round(c,449,221,62,41,9,'#b6c6e4');round(c,445,214,70,12,5,'#f0d4e9');star(c,480,242,11,'#f8e7b5');
        for(let i=0;i<3;i++){const phase=(t*.35+i*.3)%1;c.save();c.globalAlpha=.85*(1-phase);const nx=474+phase*65+i*8,ny=199-phase*36;ellipse(c,nx,ny,5,3.5,['#ac92ce','#d2a2c5','#a2c6d7'][i]);line(c,[[nx+4,ny],[nx+4,ny-15],[nx+10,ny-12]],['#ac92ce','#d2a2c5','#a2c6d7'][i],2);c.restore();}
      }
      if(step===2){
        const yy=301-p*70;round(c,644,yy,110,76,16,'#baa8df');round(c,649,yy+5,100,18,8,'#ead8f2');for(let i=0;i<4;i++)star(c,661+i*23,yy+37+(i%2)*14,6,'#fff0c5');
      }
      c.fillStyle='rgba(36,27,75,'+(.25*dim)+')';c.fillRect(0,0,900,340);
    }
    if(o.completed){for(let i=0;i<5;i++){const x=570+i*42;star(c,x,77-Math.sin(t*2+i)*4,5+i%2*2,['#eec56c','#c4a0ec','#92cfd5'][i%3]);}}
    c.restore();c.restore();
  }

  function crib(c, o) {
    shadow(c, 43, 20);
    // Sturdy posts, open rails and a soft fitted mattress.
    const w = 43, d = 27;
    for (const p of [[-21, -13], [21, -13], [-21, 13], [21, 13]]) box(c, p[0], p[1], 3.5, 3.5, 10, {top:P.woodLight,left:P.wood,right:P.woodDark});
    box(c, 0, 0, w, d, 8, {top:'#e6c09a',left:'#d29a78',right:'#be866a'}, 8);
    box(c, 0, 0, 38, 22, 4, {top:'#fff5dc',left:'#eadbc6',right:'#ddd0c2'}, 17);
    // Back rails.
    for (let x = -20; x <= 20; x += 8) box(c, x, -13, 2.2, 2.2, 27, {top:'#f8dbb1',left:'#ebc49c',right:'#d4a783'}, 18);
    box(c, 0, -13, 46, 3.5, 4, {top:'#ffe2b5',left:'#e4b58e',right:'#c79170'}, 44);
    box(c, -22, 0, 3.5, 28, 4, {top:'#ffe2b5',left:'#e4b58e',right:'#c79170'}, 44);
    for (const p of [[-22,-13], [22,-13], [-22,13], [22,13]]) {
      box(c, p[0], p[1], 4, 4, 43, {top:'#ffe0ad',left:'#e8bd96',right:'#cea080'}, 5);
      const pos=iso(p[0],p[1],49); ellipse(c,pos[0],pos[1],3,2.1,'#ffe5b9');
    }
    if (o.baby) { c.save(); c.translate(0,-20); c.rotate(-.35); drawBaby(c,0,0,.78,o.sleeping!==false,'#b5c9df',{time:o.time,reducedMotion:o.reducedMotion,reaction:o.reaction}); c.restore(); }
    // Front side and end, with gaps revealing the baby.
    for (let x = -17; x <= 19; x += 7) box(c,x,13,1.7,1.7,24,{top:'#f7d8b0',left:'#e9c5a3',right:'#d2a484'},18);
    for (let y = -7; y <= 9; y += 7) box(c,22,y,1.7,1.7,24,{top:'#f7d8b0',left:'#e9c5a3',right:'#d2a484'},18);
    box(c,0,13,46,3.5,4,{top:'#ffe3b7',left:'#e6bd97',right:'#c99174'},42);
    box(c,22,0,3.5,28,4,{top:'#ffe3b7',left:'#e6bd97',right:'#c99174'},42);
    // A small moon plaque on the front rail.
    const p = iso(1,16,34); ellipse(c,p[0],p[1],5,5,'#ba9cd7'); star(c,p[0],p[1],3,P.cream);
    // Mobile hangs clear above the crib, with symbols rather than text.
    bezier(c,[-27,-47,-37,-77,-4,-85,10,-73],P.woodDark,2.3);
    line(c,[[10,-73],[10,-67]],'#d9b37d',1.1);
    line(c,[[-3,-65],[10,-68],[22,-62]],P.gold,2);
    const swing = o.reducedMotion ? 0 : Math.sin((o.time||0)*.0018)*2;
    line(c,[[-3,-65],[-3+swing,-55]],P.woodDark,.9);line(c,[[22,-62],[22-swing,-52]],P.woodDark,.9);
    star(c,-3+swing,-53,4.3,P.gold);star(c,22-swing,-50,4,'#b89bdb');
    if(o.decorations?.includes('starMobile')) {
      line(c,[[10,-68],[10+swing*.5,-51]],P.woodDark,.9);
      star(c,10+swing*.5,-47,6,'#ed9fae');
      sparkle(c,10+swing*.5,-47,2,'#fff4d5');
    }
    if(o.baby&&o.sleeping&&!o.reducedMotion){
      const phase=((o.time||0)*.0003)%1;c.save();c.globalAlpha=Math.sin(phase*Math.PI)*.6;
      star(c,27+phase*6,-58-phase*17,2.8,'#b4a0cf');c.restore();
    }
  }

  function sofa(c, o) {
    shadow(c, 58, 22);
    for (const p of [[-28,-11],[28,-11],[-28,13],[28,13]]) box(c,p[0],p[1],4,4,8,{top:P.wood,left:P.woodDark,right:'#976957'});
    box(c,0,0,67,28,15,{top:'#eda0a5',left:'#d18093',right:'#ae6a84'},7);
    box(c,0,-11,68,8,27,{top:'#f6bec0',left:'#e99da5',right:'#c87e93'},19);
    for (const x of [-17,17]) {
      box(c,x,3,31,20,5,{top:'#f7b4b7',left:'#e79ba6',right:'#ce8298'},22);
      projectedLine(c,[x-12,-2,28],[x+12,-2,28],'rgba(255,255,255,.3)',1);
    }
    box(c,-33,1,8,31,19,{top:'#f7bec2',left:'#df91a1',right:'#c27a92'},15);
    box(c,33,1,8,31,19,{top:'#f7bec2',left:'#df91a1',right:'#c27a92'},15);
    // Soft cushions, in foreground screen-space coordinates.
    c.save(); c.translate(-14,-32); c.rotate(-.23); round(c,-9,-11,18,18,5,'#fbe5bc'); star(c,0,-2,4,'#e6ac69'); c.restore();
    c.save(); c.translate(20,-18); c.rotate(.18); round(c,-8,-12,16,17,5,'#9ad1c8'); line(c,[[-4,-8],[4,-2],[-4,3]],'rgba(255,255,255,.6)',1.4); c.restore();
    if(o.decorations?.includes('cushions')){c.save();c.translate(2,-26);c.rotate(-.12);round(c,-8,-10,17,18,5,'#b7a5df');heart(c,.5,-1,5,'#fff1d4');c.restore();}
  }
  function rug(c, o) {
    const cols=[['#c4afdf','#e1d3ed'],['#9ac9bf','#d0e8d5'],['#f0c188','#ffe4b1']][Math.abs(o.variant||0)%3];
    ellipse(c,0,0,49,25,'rgba(93,65,87,.08)'); ellipse(c,0,-1,47,23,cols[0]);
    c.beginPath(); c.ellipse(0,-1,40,18.8,0,0,Math.PI*2); c.strokeStyle=cols[1];c.lineWidth=2.3;c.stroke();
    c.save(); c.translate(0,-1); c.scale(1,.5); star(c,0,0,20,cols[1],.3); c.restore();
    for(let i=-2;i<=2;i++) line(c,[[-45,i*4-3],[-50,i*4-4]],cols[1],1.6);
  }
  function dresser(c, o) {
    shadow(c, 34, 15);
    box(c,0,0,40,21,39,{top:'#f1d7b2',left:'#e1b48f',right:'#b88870'},4);
    box(c,0,0,44,25,5,{top:'#ffdfb5',left:'#e7bc96',right:'#c99779'},43);
    // Three front drawers, with brass handles.
    for(let z=10;z<=34;z+=12) {
      projectedLine(c,[-17,11,z],[17,11,z],'#bd876c',1);
      const h=iso(0,11.7,z+5); ellipse(c,h[0],h[1],3,1.5,'#a87559');
      line(c,[[h[0]-3,h[1]-1],[h[0]+3,h[1]+1]],'#f8d889',2.3);
    }
    const p=iso(5,-2,49); ellipse(c,p[0],p[1],8,4,'#adc7ca'); ellipse(c,p[0],p[1]-2,7,3.5,'#cde1df');
    const q=iso(-12,-3,48); round(c,q[0]-3,q[1]-12,7,12,2,'#fbf4e6'); round(c,q[0]-1,q[1]-15,3,4,1,'#a0c6bd');
  }
  function plant(c, o) {
    shadow(c,15,7);
    ellipse(c,0,-3,10,4,P.roseDark);
    poly(c,[[-12,-18],[12,-18],[9,-2],[-9,-2]],o.variant%2?'#d79b70':'#e3a599');
    ellipse(c,0,-18,12,5,o.variant%2?'#efbd8f':'#f1b9ad'); ellipse(c,0,-18,9,3.1,'#76594e');
    bezier(c,[0,-18,-5,-34,4,-44,1,-55],'#5b8c71',2.2);
    const leaves=[[-4,-34,-14,-42,.7],[3,-31,17,-37,-.7],[-1,-44,-13,-52,.8],[2,-46,14,-57,-.7],[1,-55,2,-65,-.1]];
    for(const l of leaves) {line(c,[[l[0],l[1]],[l[2],l[3]]],'#5b8c71',1.5);ellipse(c,l[2],l[3],5.5,10,l[2]<0?'#72ae89':'#95c39b',l[4]);}
    line(c,[[-6,-12],[-5,-6]],'rgba(255,255,255,.25)',1.8);
  }
  function speaker(c,o) {
    o=o||{};const pulse=o.reaction==='music'&&!o.reducedMotion?Math.sin((o.time||0)*.009)*.65:0;
    shadow(c,18,9);box(c,0,0,20,17,39,{top:'#5b4b83',left:'#403455',right:'#29233d'},2);
    c.save();const p=iso(-1,9,24);c.translate(p[0],p[1]);c.transform(1,.5,0,1,0,0);
    ellipse(c,0,0,7,9,'#211c36');ellipse(c,0,0,5+pulse,6.5+pulse,'#a08cc9');ellipse(c,0,0,2.2,3,'#51456e');
    ellipse(c,0,-14,3.2,4,'#302c43');ellipse(c,0,-14,1.2,1.7,'#b99dcf');c.restore();
    const led=iso(7,9,35);ellipse(c,led[0],led[1],1.1,1.2,'#a5e5c7');
  }
  function piano(c,o) {
    o=o||{};const active=o.reaction==='music'&&!o.reducedMotion?Math.floor((o.time||0)/280)%12:-1;
    shadow(c,40,17);
    for(const p of [[-24,0],[24,0]]) box(c,p[0],p[1],4,4,30,{top:'#766d91',left:'#665977',right:'#4f4566'});
    box(c,0,-5,55,19,25,{top:'#a689cf',left:'#6b5199',right:'#443667'},27);
    box(c,0,7,58,15,5,{top:'#dfd5f4',left:'#927bbd',right:'#675186'},28);
    projectedLine(c,[-27,-14,53],[27,-14,53],'#a9dfe3',1.6);
    for(let i=0;i<12;i++) box(c,-25+i*4.5,8,3.9,13,1,{top:i===active?'#c3a0f0':'#fffaf0',left:'#ece4da',right:'#c8c0c9'},i===active?32.2:33);
    for(let i=0;i<11;i++) if(i%7!==2&&i%7!==6) box(c,-22.7+i*4.5,3,2,7,2,{top:'#554765',left:'#423951',right:'#30283e'},34);
    const p=iso(0,-3,54);c.save();c.translate(p[0],p[1]);c.rotate(.1);round(c,-10,-14,21,15,2,'#fff7df');line(c,[[-6,-9],[6,-9]],'#d7c1bf',.7);line(c,[[-6,-6],[6,-6]],'#d7c1bf',.7);star(c,0,-4,3,P.gold);c.restore();
  }
  function table(c, o) {
    shadow(c,35,15);
    for(const p of [[-18,-12],[18,-12],[-18,12],[18,12]]) box(c,p[0],p[1],4,4,25,{top:P.woodLight,left:P.wood,right:P.woodDark});
    box(c,0,0,48,33,5,{top:'#f4d6b1',left:'#d9ac88',right:'#bd8c72'},26);
    // Table runner lies in the top plane.
    const z=31.1;poly(c,[iso(-8,-16,z),iso(8,-16,z),iso(8,16,z),iso(-8,16,z)],'#a8c9bf');
    for(const p of [[-14,-5],[13,5]]){const q=iso(p[0],p[1],32);ellipse(c,q[0],q[1],7,3.6,'#fff6df');ellipse(c,q[0],q[1],5,2.5,'#efdcc6');}
    const q=iso(2,-8,32);round(c,q[0]-3,q[1]-8,6,8,2,'#d9a2b4');ellipse(c,q[0],q[1]-8,3,1.6,'#f3c1cc');
    const b=iso(-12,-5,33);ellipse(c,b[0]-1,b[1],2.5,2.3,'#e9a565');ellipse(c,b[0]+2,b[1]-1,2,2,'#e9c66f');
  }
  function tree(c,o) {
    shadow(c,39,17,.12);
    bezier(c,[1,0,-4,-25,5,-45,1,-65],'#a57558',11);
    bezier(c,[1,-33,-5,-43,-14,-42,-17,-53],'#a57558',5);
    bezier(c,[1,-47,8,-51,14,-55,18,-64],'#b78b64',5);
    bezier(c,[-1,-3,-2,-24,2,-36,1,-52],'#c99b70',3);
    const colors = o.variant%2 ? ['#d894aa','#efb0b9','#f5c6c3'] : ['#76aa88','#94bf96','#b1d2a3'];
    ellipse(c,-19,-61,24,24,colors[0]);ellipse(c,19,-65,26,27,colors[0]);ellipse(c,0,-84,28,27,colors[1]);
    ellipse(c,-14,-73,24,23,colors[1]);ellipse(c,14,-81,23,24,colors[1]);ellipse(c,-6,-92,20,15,colors[2]);
    ellipse(c,26,-70,14,17,colors[1]);ellipse(c,-28,-60,10,12,colors[1]);
    for(const p of [[-16,-88],[12,-76],[-2,-58],[26,-63]]){ellipse(c,p[0],p[1],2.5,2,'rgba(255,248,215,.47)');}
    if(o.variant%2){for(const p of [[-19,-72],[5,-96],[25,-63],[-5,-54]]){for(let i=0;i<5;i++)ellipse(c,p[0]+Math.cos(i*1.256)*2,p[1]+Math.sin(i*1.256)*2,2.1,2.1,'#ffe1d8');ellipse(c,p[0],p[1],1.2,1.2,'#dfb162');}}
  }
  function lamp(c) {
    shadow(c,18,8);ellipse(c,0,-1,14,6,'#bd8e73');ellipse(c,0,-3,13,5,'#dfb38b');line(c,[[0,-4],[0,-65]],'#bd8f69',3.5);
    ellipse(c,0,-67,17,6,'#f6d5a3');poly(c,[[-17,-67],[-10,-84],[10,-84],[17,-67]],'#fff0ce');ellipse(c,0,-84,10,3.5,'#fff7df');
    ellipse(c,0,-66,15,4,'#ffdf9e');line(c,[[9,-66],[9,-53]],'#b9976a',.9);ellipse(c,9,-51.8,1.3,2,'#edc273');
  }
  function bench(c) {
    shadow(c,44,18);
    for(const p of [[-24,0],[24,0]]) box(c,p[0],p[1],5,17,16,{top:'#819a8e',left:'#5d857b',right:'#456e6d'});
    for(const y of [-7,0,7]) box(c,0,y,59,5,3,{top:'#d4b28c',left:'#b59477',right:'#97775e'},18);
    for(const x of [-25,25]) box(c,x,-9,3,3,26,{top:'#75988c',left:'#5c8176',right:'#446961'},18);
    for(const z of [26,35]) box(c,0,-9,59,3,6,{top:'#d8b993',left:'#bb9b7d',right:'#a18368'},z);
  }
  function flowerbox(c,o) {
    shadow(c,29,12);box(c,0,0,36,16,14,{top:'#a27760',left:'#d89b86',right:'#b87b73'},2);
    box(c,0,0,38,18,3,{top:'#efbaa0',left:'#e5aa92',right:'#c98d7d'},16);
    const blooms=[[-13,-2,27,'#eea1ac'],[-5,1,34,'#c4a2d7'],[5,-3,30,'#f8ce71'],[13,1,25,'#e6a0b9']];
    for(const p of blooms){const b=iso(p[0],p[1],19),t=iso(p[0],p[1],p[2]);line(c,[b,t],'#769c74',1.6);ellipse(c,t[0]-3,t[1]+6,2.8,5,'#89b58b',-.7);for(let i=0;i<5;i++)ellipse(c,t[0]+Math.cos(i*1.256)*3,t[1]+Math.sin(i*1.256)*3,3,3,p[3]);ellipse(c,t[0],t[1],2,2,'#fff0ba');}
  }
  function easel(c,o) {
    shadow(c,24,10);line(c,[[-18,0],[-2,-64],[20,0]],'#bc8c65',4);line(c,[[8,-48],[27,-3]],'#9d795e',3.5);
    poly(c,[[-18,-53],[18,-47],[18,-16],[-18,-22]],'#bd946f');poly(c,[[-15,-50],[15,-45],[15,-20],[-15,-25]],'#fff3d7');
    // A hand-painted landscape in the little canvas.
    poly(c,[[-13,-33],[-5,-41],[3,-28],[9,-36],[13,-32],[13,-22],[-13,-26]],'#9fc9ad');
    ellipse(c,5,-39,4,4,'#f2ca76');line(c,[[-21,-19],[21,-12]],'#d9ad80',4);
    ellipse(c,23,-15,6,3,'#c99472');ellipse(c,21,-16,1.2,.8,'#ef9aa5');ellipse(c,25,-14,1.2,.8,'#80b6bc');
  }
  function gift(c,o) {
    shadow(c,20,9);box(c,0,0,22,19,22,{top:'#cfb6e7',left:'#b69bd5',right:'#907aac'},2);
    box(c,0,0,24,21,4,{top:'#dfc9ef',left:'#c0a6dc',right:'#9f8abd'},24);
    poly(c,[iso(-2,-10.5,28.1),iso(2,-10.5,28.1),iso(2,10.5,28.1),iso(-2,10.5,28.1)],'#ffe0a0');
    poly(c,[iso(-12,-2,28.2),iso(12,-2,28.2),iso(12,2,28.2),iso(-12,2,28.2)],'#ffe0a0');
    const a=iso(-2,10.6,24),b=iso(2,10.6,24),d=iso(2,10.6,2),e=iso(-2,10.6,2);poly(c,[a,b,d,e],'#f5ce89');
    ellipse(c,-5,-31,6,3.2,'#f7d38f',.5);ellipse(c,5,-31,6,3.2,'#ffdfa3',-.5);ellipse(c,0,-29,2.5,2.4,'#e9b96d');
  }
  function suitcase(c) {
    shadow(c,22,10);box(c,0,0,26,14,24,{top:'#b2ced0',left:'#7db2b7',right:'#558e9d'},3);
    projectedLine(c,[-10,7.2,7],[10,7.2,7],'#6095a2',1);projectedLine(c,[-7,7.2,3],[-7,7.2,27],'#e5d2a2',2.6);projectedLine(c,[7,7.2,3],[7,7.2,27],'#e5d2a2',2.6);
    const p=iso(0,0,27);bezier(c,[p[0]-5,p[1],p[0]-6,p[1]-11,p[0]+7,p[1]-8,p[0]+5,p[1]+2],'#e5d3ad',3);
    const q=iso(0,7.5,17);star(c,q[0],q[1],4,'#fff1be');
  }
  function stage(c,o) {
    o=o||{};const t=o.reducedMotion?0:(o.time||0)*.001;
    // A small concert portal: no flashing, only slow spotlights and physical light-bar motion.
    const a=iso(-37,-22,10),b=iso(37,-22,10);
    line(c,[[a[0],a[1]],[a[0],a[1]-68],[b[0],b[1]-68],[b[0],b[1]]],'#574373',4);
    line(c,[[a[0]+1,a[1]-65],[b[0]-1,b[1]-65]],'#bd96e9',2);
    for(let i=0;i<3;i++){
      const f=(i+1)/4,x=a[0]+(b[0]-a[0])*f,y=a[1]+(b[1]-a[1])*f-67;
      ellipse(c,x,y,4,4,['#a0dedb','#f0c471','#d3acf0'][i]);
      if(o.reaction==='music'){c.save();c.globalAlpha=.12;const lean=Math.sin(t*.8+i)*12;poly(c,[[x-3,y+3],[x+3,y+3],[x+lean+20,6],[x+lean-20,6]],['#74d2d6','#f3cd78','#bd8fe5'][i]);c.restore();}
    }
    shadow(c,71,30);box(c,0,0,81,52,9,{top:'#a997d0',left:'#74588f',right:'#4e406f'},1);
    for(let x=-32;x<=32;x+=16)projectedLine(c,[x,-24,10.2],[x,24,10.2],'rgba(113,84,141,.12)',1);
    for(let x=-32;x<=32;x+=13){const p=iso(x,27,5);ellipse(c,p[0],p[1],2.1,2.3,x%2?'#a2ddd8':'#ffe6ab');}
    const p=iso(15,-9,10);line(c,[[p[0],p[1]],[p[0],p[1]-41]],'#7c6a8a',2);ellipse(c,p[0],p[1],7,3,'#9882a2');
    line(c,[[p[0],p[1]-40],[p[0]+8,p[1]-45]],'#6a5a77',2.5);ellipse(c,p[0]+9,p[1]-46,3.5,5,'#c0adcc',.8);
    const q=iso(-18,3,10.2);c.save();c.translate(q[0],q[1]);c.scale(1,.5);star(c,0,0,17,'#fff1c5');c.restore();
  }
  function babyMat(c,o) {
    shadow(c,34,17,.06);ellipse(c,0,-1,33,17,'#d6bcde');ellipse(c,0,-2,29,14.5,'#ebd5e5');
    c.save();c.scale(1,.5);star(c,-15,-7,7,'#f4d89d');star(c,16,6,5,'#b4c8df');c.restore();
    if(o.baby) drawBaby(c,0,-8,.9,o.sleeping===true,'#9acbc4',{stage:o.babyStage,time:o.time,reaction:o.reaction,reducedMotion:o.reducedMotion});
    bezier(c,[-27,-3,-28,-46,23,-56,28,-4],'#e0b17e',3);
    for(const p of [[-10,-32],[9,-35]]){const sway=o.reducedMotion?0:Math.sin((o.time||0)*.002+p[0])*.9;line(c,[[p[0],p[1]-5],[p[0]+sway,p[1]+3]],'#d5b285',1);star(c,p[0]+sway,p[1]+7,4,p[0]<0?'#eed288':'#a58dc6');}
  }

  function shapeGarden(c,o) {
    shadow(c,52,23,.08);
    const plots=[{x:-26,y:-5,color:'#e7b6c1',shape:0},{x:4,y:-15,color:'#e6c47f',shape:1},{x:29,y:6,color:'#b4a0d5',shape:2}];
    for(const p of plots){
      c.save();c.translate(p.x,p.y);c.scale(1,.5);
      if(p.shape===0){ellipse(c,0,0,20,20,p.color);ellipse(c,0,-3,15,15,'#8a6b56');}
      if(p.shape===1){poly(c,[[0,-25],[23,16],[-23,16]],p.color);poly(c,[[0,-18],[15,10],[-15,10]],'#8a6b56');}
      if(p.shape===2){round(c,-19,-19,38,38,4,p.color);round(c,-14,-17,28,28,2,'#8a6b56');}
      c.restore();
      const sway=o.reducedMotion?0:Math.sin((o.time||0)*.002+p.x)*1.1;
      line(c,[[p.x,p.y],[p.x+sway,p.y-20]],'#6b9f7b',2);
      ellipse(c,p.x-5,p.y-9,3,6,'#91bd93',-.8);
      for(let j=0;j<5;j++)ellipse(c,p.x+sway+Math.cos(j*1.256)*4,p.y-22+Math.sin(j*1.256)*4,3.9,3.9,p.color);
      ellipse(c,p.x+sway,p.y-22,2.7,2.7,'#fff1b5');
    }
    // A small watering can is always reachable next to the three shaped beds.
    ellipse(c,-18,13,8,5,'#81b8b3');round(c,-26,2,16,11,3,'#8cc7bf');
    line(c,[[-12,5],[-5,-2],[-2,-1]],'#75aaa7',3);bezier(c,[-25,3,-38,-4,-36,17,-25,11],'#75aaa7',2.6);
  }
  function memoryTable(c,o) {
    shadow(c,41,18);box(c,0,0,47,31,13,{top:'#acd2c5',left:'#82b4a9',right:'#5c928f'},2);
    box(c,0,0,50,34,4,{top:'#d5e6d6',left:'#aed1be',right:'#7eaaa2'},15);
    for(let i=0;i<4;i++){
      const p=iso((i%2)*19-9,Math.floor(i/2)*13-6,20);c.save();c.translate(p[0],p[1]);c.transform(1,.5,-.45,.8,0,0);
      round(c,-7,-10,14,19,2,'#fff9e9','#c5b8c7',.7);
      if(i===1||i===2)heart(c,0,0,4.5,'#d78aa0');else star(c,0,-1,5,'#b6a2d4');c.restore();
    }
    const p=iso(17,-9,20);box(c,17,-9,9,11,5,{top:'#bba4db',left:'#947caf',right:'#7c669c'},20);
  }
  function beadStand(c,o) {
    shadow(c,38,16);box(c,0,0,41,25,20,{top:'#f5d8ba',left:'#d6af8d',right:'#b88d76'},2);
    box(c,0,0,45,28,4,{top:'#ffe5c5',left:'#dfbda0',right:'#bd957c'},23);
    const linePoints=[];
    for(let i=0;i<7;i++){const p=iso(-17+i*5.5,Math.sin(i*.9)*5,28);linePoints.push(p);}
    line(c,linePoints,'#b88aa1',1.5);
    linePoints.forEach((p,i)=>{
      const color=['#d995b2','#8ebdb7','#d995b2','#8ebdb7'][i%4];
      if(i%2)round(c,p[0]-3.6,p[1]-4.3,7.2,7.2,1.8,color);
      else ellipse(c,p[0],p[1]-1.5,4,3.7,color);
      ellipse(c,p[0]-.7,p[1]-2.6,.7,.8,'#fff6e9');
    });
    const p=iso(0,-10,28);line(c,[[p[0],p[1]],[p[0],p[1]-29]],'#bda0c9',3);line(c,[[p[0]-14,p[1]-28],[p[0]+16,p[1]-23]],'#bda0c9',3);
    for(let i=0;i<3;i++){const x=p[0]-10+i*10,y=p[1]-26+i*1.5;line(c,[[x,y],[x,y+9]],'#d2b0bd',1);star(c,x,y+12,3.7,['#e2a5bb','#f1cb7e','#a5c5bd'][i]);}
  }
  function flowerArch(c,o) {
    shadow(c,48,15,.08);
    bezier(c,[-43,3,-50,-101,43,-109,44,3],'#dcc3a0',5);
    bezier(c,[-43,3,-50,-101,43,-109,44,3],'#91b889',2);
    const points=[[-43,-16],[-40,-39],[-32,-61],[-15,-73],[7,-76],[28,-64],[40,-44],[44,-20]];
    points.forEach((p,i)=>{
      ellipse(c,p[0]-4,p[1]+5,4,8,'#94bf97',i%2?-.7:.6);
      ellipse(c,p[0]+5,p[1]-3,4,8,'#accd9e',i%2?.8:-.4);
      for(let j=0;j<5;j++)ellipse(c,p[0]+Math.cos(j*1.256)*4,p[1]+Math.sin(j*1.256)*4,3.5,3.5,i%2?'#eeb7c5':'#e6cf98');
      ellipse(c,p[0],p[1],2.3,2.3,'#fff0c7');
    });
    for(const x of [-42,43]){round(c,x-6,-4,13,9,3,'#d4b69d');ellipse(c,x+.5,-4,6.5,2.5,'#f0d6b7');}
  }

  const objects = {crib,sofa,rug,dresser,plant,speaker,piano,table,tree,lamp,bench,flowerbox,easel,gift,suitcase,stage,baby_mat:babyMat,shape_garden:shapeGarden,memory_table:memoryTable,bead_stand:beadStand,flower_arch:flowerArch};
  const bounds = Object.freeze({
    crib:{w:94,h:108},sofa:{w:122,h:83},rug:{w:104,h:51},dresser:{w:76,h:83},plant:{w:47,h:80},speaker:{w:44,h:62},
    piano:{w:90,h:86},table:{w:92,h:64},tree:{w:103,h:133},lamp:{w:45,h:98},bench:{w:93,h:76},flowerbox:{w:65,h:60},
    easel:{w:62,h:76},gift:{w:55,h:56},suitcase:{w:55,h:57},stage:{w:150,h:120},baby_mat:{w:78,h:65},shape_garden:{w:118,h:72},memory_table:{w:90,h:65},bead_stand:{w:86,h:89},flower_arch:{w:114,h:113}
  });

  function drawObject(c,type,o) {
    o=o||{}; c.save();c.translate(o.x||0,o.y||0);c.scale(o.scale==null?1:o.scale,o.scale==null?1:o.scale);
    const time=o.reducedMotion?0:(o.time||0);
    if(!o.reducedMotion && ['tree','plant','flowerbox'].includes(type))c.rotate(Math.sin(time*.0014+(o.x||0))*.006);
    const draw=objects[type];if(draw)draw(c,o);
    if(o.reaction==='music'&&['piano','speaker','stage'].includes(type)&&!o.reducedMotion){
      const phase=(time*.0006)%1;c.save();c.globalAlpha=Math.sin(phase*Math.PI)*.7;
      for(let i=0;i<2;i++){const x=13+i*15+Math.sin(time*.003+i)*2,y=-55-phase*22-i*7;ellipse(c,x,y,3,2.3,['#b699d1','#d89db7'][i]);line(c,[[x+2,y],[x+2,y-10],[x+7,y-8]],['#b699d1','#d89db7'][i],1.5);}c.restore();
    }
    if(o.active&&type!=='rug'){
      const height=(bounds[type]||{h:64}).h;
      const y=-height+9+Math.sin(time*.003)*2;
      sparkle(c,0,y,5.5,'#efc66b');sparkle(c,10,y-7,2.5,'#fff1bf');
    }
    c.restore();
  }

  function drawGround(c,o) {
    o=o||{}; const x=o.x||0,y=o.y||0,w=o.width||72,h=o.height||36;
    const grass=o.kind==='grass',alt=Math.abs((o.variant||0))%3;
    const fill=o.color||(grass?['#b7d2ad','#bdd7b1','#b0cfa7'][alt]:['#f1d4ad','#f5dbb8','#edd0a7'][alt]);
    poly(c,[[x,y-h/2],[x+w/2,y],[x,y+h/2],[x-w/2,y]],fill);
    if(o.grid!==false){line(c,[[x-w/2,y],[x,y+h/2],[x+w/2,y]],grass?'rgba(92,133,95,.10)':'rgba(168,120,87,.12)',.8);}
    if(grass&&alt===1){line(c,[[x-5,y+2],[x-6,y-1],[x-4,y+1],[x-2,y-1]],'#9bbb90',.8);}
    if(!grass&&o.planks){line(c,[[x-w/4,y-h/4],[x+w/4,y+h/4]],'rgba(156,108,79,.10)',.8);}
  }

  function drawRoomBase(c,o) {
    o=o||{};const x=o.x||0,y=o.y||0,w=o.width||360,d=o.depth||260,h=o.wallHeight||90;
    c.save();c.translate(x,y);const corners=[iso(-w/2,-d/2,0),iso(w/2,-d/2,0),iso(w/2,d/2,0),iso(-w/2,d/2,0)];
    poly(c,corners,o.floorColor||'#efd1ac');
    poly(c,[corners[0],corners[1],[corners[1][0],corners[1][1]-h],[corners[0][0],corners[0][1]-h]],o.rightWall||'#e4d4e5');
    poly(c,[corners[3],corners[0],[corners[0][0],corners[0][1]-h],[corners[3][0],corners[3][1]-h]],o.leftWall||'#f5e5db');
    line(c,[corners[3],corners[0],corners[1]],'#c8a7a0',4);
    line(c,[[corners[3][0],corners[3][1]-h],[corners[0][0],corners[0][1]-h],[corners[1][0],corners[1][1]-h]],'#fff1e4',3);
    c.restore();
  }

  const iconPaths={
    star:'<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3L2.8 9.7l6.4-.9Z"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 9l12-2"/>',
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/>',
    baby:'<circle cx="12" cy="12" r="8"/><path d="M10 4c-1-3 5-3 4 0M8 10h.01M16 10h.01M9 15c2 2 4 2 6 0M4 10c-3-2-3 5 0 4M20 10c3-2 3 5 0 4"/>',
    book:'<path d="M12 6c-4-3-9-2-9-2v15s5-1 9 2c4-3 9-2 9-2V4s-5-1-9 2Z"/><path d="M12 6v15"/>',
    clothes:'<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c-2 3-6 3-8 0Z"/>',
    leaf:'<path d="M20 3C8 2 2 8 5 16c7 6 16 0 15-13Z"/><path d="M3 21 15 9"/>',
    suitcase:'<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V4h8v3M8 7v14M16 7v14"/>',
    volume:'<path d="m11 3-6 5H2v8h3l6 5ZM15 8c3 2 3 6 0 8M18 5c6 4 6 10 0 14"/>',
    replay:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
    pause:'<path d="M8 4v16M16 4v16"/>',
    check:'<path d="m4 12 5 5L20 6"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    parents:'<circle cx="8" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 21v-4a6 6 0 0 1 12 0v4M14 14a5 5 0 0 1 8 4v3"/>',
    sparkle:'<path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7Z"/>'
  };
  Object.assign(iconPaths, {
    album: iconPaths.book,
    shirt: iconPaths.clothes,
    bag: iconPaths.suitcase,
    sound: iconPaths.volume,
    repeat: iconPaths.replay,
    play: '<path d="m8 4 13 8-13 8Z"/>',
    back: '<path d="m14 5-7 7 7 7M7 12h14"/>',
    arrow: '<path d="M3 12h17m-6-7 7 7-7 7"/>',
    mute: '<path d="m11 3-6 5H2v8h3l6 5ZM16 8l6 8M22 8l-6 8"/>',
    settings: '<path d="m9 3 1-1h4l1 3 3 1 3 1v4l-2 2-1 3 1 3-3 2-3-1-3 1-3 1-2-3 1-3-2-2v-4l3-1 1-3Z"/><circle cx="12" cy="12" r="3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    moon: '<path d="M20.8 14.2A9 9 0 0 1 9.8 3.1 9 9 0 1 0 20.8 14.2Z"/>',
    food: '<path d="M3 11h18a9 9 0 0 1-18 0ZM6 21h12M7 8c-2-2 2-3 0-5M12 8c-2-2 2-3 0-5M17 8c-2-2 2-3 0-5"/>',
    palette: '<path d="M21 12c0-6-8-11-14-8-7 3-6 14 1 16 3 1 5 1 6-1 1-2-2-3-1-5 1-2 8 2 8-2Z"/><circle cx="7" cy="9" r="1"/><circle cx="11" cy="6" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="6" cy="14" r="1"/>',
    sparkles: '<path d="m9 7 2.2 5.8L17 15l-5.8 2.2L9 23l-2.2-5.8L1 15l5.8-2.2ZM18 1l1.3 3.7L23 6l-3.7 1.3L18 11l-1.3-3.7L13 6l3.7-1.3Z"/>',
    shapes:'<circle cx="6" cy="6" r="4"/><path d="m16 2 5 8H11Z"/><rect x="5" y="14" width="12" height="8" rx="1"/>',
    memory:'<rect x="2" y="3" width="9" height="15" rx="2"/><rect x="13" y="6" width="9" height="15" rx="2"/><path d="m4 8 2.5 4L9 8m6 3 2.5 4 2.5-4"/>',
    patterns:'<path d="M2 12h20"/><circle cx="5" cy="12" r="3"/><rect x="10" y="9" width="6" height="6" rx="1"/><circle cx="21" cy="12" r="2"/>',
    hand: '<path d="M8 13V6a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9c0 4-3 6-7 6-3 0-5-2-6-4l-4-6a2 2 0 0 1 3-2l2 3Z"/>'
  });
  Object.assign(iconPaths, {
    wash:'<path d="M4 8V5h9v3M9 5V2M15 8v2m-2 1v2m4-2v2M3 16c2-3 5-2 8 0l3 1 4-3c3-2 4 1 2 3l-6 4H7l-4-3Z"/><circle cx="7" cy="12" r="1"/><circle cx="19" cy="7" r="1"/>',
    bottle:'<path d="M10 5V3a2 2 0 0 1 4 0v2M8 5h8v3H8ZM8 8l-2 4v7a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-7l-2-4M7 14h10M13 17h3M13 20h3"/>',
    spoon:'<ellipse cx="7" cy="6" rx="4" ry="5"/><path d="M7 11v10M13 13h9a4.5 4.5 0 0 1-9 0ZM15 21h5"/>',
    cloth:'<path d="M4 4h16v15l-4 2-4-2-4 2-4-2ZM7 7h10M7 10h10M7 13h5"/><path d="m15 14 .8 2.2L18 17l-2.2.8L15 20l-.8-2.2L12 17l2.2-.8Z"/>',
    nappy:'<path d="M3 6h18l-2 10-4 5H9l-4-5ZM3 6v5l5 2M21 6v5l-5 2M8 13l1 8M16 13l-1 8"/><path d="m10 9 2 2 2-2"/>',
    cuddle:'<path d="M4 17c-4-4-2-9 2-8l5 4M20 17c4-4 2-9-2-8l-5 4M4 17l6 5h4l6-5"/><circle cx="12" cy="7" r="4"/><path d="m9 14 3 5 3-5M10 7h.1M14 7h.1"/>',
    rattle:'<circle cx="12" cy="7" r="5"/><path d="M10 12v6M14 12v6"/><rect x="8" y="18" width="8" height="4" rx="2"/><path d="m12 4 1 2 2 .3-1.5 1.5.4 2-1.9-1-1.9 1 .4-2L9 6.3l2-.3ZM3 4 1 3M21 4l2-1M2 10H0M22 10h2"/>',
    blanket:'<path d="M3 5h18v15l-3 2-3-2-3 2-3-2-3 2-3-2ZM3 9h18"/><path d="m12 12 1 2 2.2.4-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L8.8 14.4 11 14Z"/>',
    bed:'<path d="M2 7v15M22 7v15M2 17h20M5 13V9h14v4M3 13h18v4M6 4l2-2 2 2M14 4l2-2 2 2"/>',
    lamp:'<path d="M8 3h8l4 9H4ZM12 12v8M7 22h10M17 12v4"/><path d="M1 4l2 1M21 5l2-1M1 9h2M21 9h2"/>',
    peekaboo:'<path d="M3 11V4h18v7M3 14l3-3 6 3 6-3 3 3v7l-3-2-6 2-6-2-3 2Z"/><path d="M8 8h.1M16 8h.1M10 10c1 1 3 1 4 0"/>',
    smile:'<circle cx="12" cy="12" r="9"/><path d="m7 9 2-1 2 1M14 9l2-1 2 1M7 14c3 6 7 6 10 0Z"/>',
    zoomin:'<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7M6 10h8M10 6v8"/>',
    zoomout:'<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7M6 10h8"/>',
    focus:'<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/><circle cx="12" cy="12" r="4"/><path d="M12 10v4M10 12h4"/>',
    wardrobe:'<rect x="3" y="2" width="18" height="20" rx="3"/><path d="M12 2v20M9 12v3M15 12v3M6 5h3M15 5h3"/>',
    garden:'<path d="M3 21h18M12 20v-8M12 17c-5 0-8-3-7-6 5 0 7 2 7 6ZM12 17c5 0 8-3 7-6-5 0-7 2-7 6Z"/><circle cx="12" cy="7" r="3"/><path d="M12 2V1M7 4 6 3M17 4l1-1"/>',
    microphone:'<rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8M10 5h4M10 8h4"/>',
    tickle:'<path d="M6 22 17 5M17 5c-5-7-12 1-9 7 3 7 14 1 12-5l-3-2ZM10 11l6 1M12 8l5 1M8 17l4 1"/>',
    finger:'<path d="M9 13V5a2 2 0 0 1 4 0v7l5 1c3 1 3 3 2 5l-2 4H9l-6-7c-1-3 2-4 3-2l3 2"/><path d="M7 3 5 1M15 3l2-2M3 7H1M18 7h3"/>'
  });
  iconPaths.feed=iconPaths.bottle;
  function icon(name) {return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(iconPaths[name]||iconPaths.sparkle)+'</svg>';}

  window.Art = Object.freeze({drawCharacter,drawObject,drawGround,drawRoomBase,drawBaby,drawCareScene,drawProp,characterPose,roundRect:round,icon,bounds,palette:P});
})();
