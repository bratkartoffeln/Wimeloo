(function (global) {
  'use strict';

  /* Offline learning islands. Sound callbacks receive MIDI note numbers. */
  var active = null;
  var instanceId = 0;
  var NUMBERS = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht'];
  var COLORS = ['#f49b90', '#a89bdc', '#80b9b0', '#e8bb69', '#8db5d9', '#cb98b5', '#94bb82', '#bdab90'];
  var NOTES = [
    { midi: 60, label: 'Sonne', symbol: 'sun', color: '#efbf67', pale: '#fff2cc' },
    { midi: 62, label: 'Wolke', symbol: 'cloud', color: '#84b2d3', pale: '#e6f2fb' },
    { midi: 64, label: 'Blume', symbol: 'flower', color: '#dc8d9d', pale: '#fce8ec' },
    { midi: 67, label: 'Stern', symbol: 'star', color: '#a494d5', pale: '#eee8fb' },
    { midi: 69, label: 'Mond', symbol: 'moon', color: '#7db2a6', pale: '#e1f3ec' }
  ];

  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function svg(inner, viewBox) {
    return '<svg viewBox="' + (viewBox || '0 0 80 80') + '" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
  }

  function icon(name, color) {
    var fill = color || '#a494d5';
    var stroke = '#514463';
    var shapes = {
      close: '<path d="m27 27 26 26m0-26L27 53" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
      check: '<path d="m22 41 12 13 25-29" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>',
      arrow: '<path d="M19 40h40M44 24l16 16-16 16" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
      back: '<path d="M60 37H25m13-13L24 38l14 13M26 37c24-3 36 6 30 21" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
      play: '<path d="M28 19v42l32-21z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
      sound: '<path d="m15 33 13 0 16-13v40L28 47H15z" fill="currentColor"/><path d="M53 28c9 7 9 17 0 24m8-33c16 12 16 30 0 42" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
      help: '<circle cx="40" cy="40" r="28" fill="' + fill + '" opacity=".23"/><path d="M31 31c0-13 22-13 22 0 0 8-13 10-13 19" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><circle cx="40" cy="60" r="3" fill="currentColor"/>',
      star: '<path d="m40 11 9 19 21 3-15 15 4 22-19-10-19 10 4-22-15-15 21-3z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2.5" stroke-linejoin="round"/><circle cx="34" cy="40" r="2" fill="' + stroke + '"/><circle cx="46" cy="40" r="2" fill="' + stroke + '"/><path d="M36 47q4 4 8 0" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round"/>',
      sun: '<g stroke="' + fill + '" stroke-width="5" stroke-linecap="round"><path d="M40 8v8m0 48v8M8 40h8m48 0h8M17 17l6 6m34 34 6 6M17 63l6-6m34-34 6-6"/></g><circle cx="40" cy="40" r="20" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/><circle cx="34" cy="39" r="2" fill="' + stroke + '"/><circle cx="46" cy="39" r="2" fill="' + stroke + '"/><path d="M35 46q5 5 10 0" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round"/>',
      cloud: '<path d="M20 57c-16 0-16-23-2-25-1-21 30-26 38-7 21-2 27 32 7 32z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2.5" stroke-linejoin="round"/><circle cx="34" cy="43" r="2" fill="' + stroke + '"/><circle cx="48" cy="43" r="2" fill="' + stroke + '"/><path d="M37 50q4 4 8 0" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round"/>',
      flower: '<g fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"><circle cx="40" cy="23" r="13"/><circle cx="56" cy="35" r="13"/><circle cx="50" cy="54" r="13"/><circle cx="30" cy="54" r="13"/><circle cx="24" cy="35" r="13"/></g><circle cx="40" cy="40" r="12" fill="#ffe7a3" stroke="' + stroke + '" stroke-width="2"/><circle cx="36" cy="39" r="1.6" fill="' + stroke + '"/><circle cx="44" cy="39" r="1.6" fill="' + stroke + '"/><path d="M37 44q3 3 6 0" fill="none" stroke="' + stroke + '" stroke-width="1.7" stroke-linecap="round"/>',
      moon: '<path d="M50 12c-30 2-37 42-11 54 14 6 28 0 34-11-25 8-45-20-23-43z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2.5" stroke-linejoin="round"/><path d="M31 43q4 4 8 0m2 10q4 4 8 0" fill="none" stroke="' + stroke + '" stroke-width="2.2" stroke-linecap="round"/><path d="m65 14 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#efbf67"/>',
      cup: '<path d="M19 23h35v37q-18 11-35 0z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3" stroke-linejoin="round"/><path d="M55 29h5c17 0 17 23-5 23" fill="none" stroke="' + stroke + '" stroke-width="4"/><ellipse cx="36.5" cy="23" rx="17.5" ry="5" fill="#fff9ef" stroke="' + stroke + '" stroke-width="3"/><path d="m30 41 5 6 10-12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
      music: '<path d="M30 53V20l30-5v32" fill="none" stroke="' + stroke + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="m30 20 30-5v11l-30 5z" fill="' + fill + '"/><ellipse cx="21" cy="56" rx="11" ry="8" transform="rotate(-20 21 56)" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/><ellipse cx="51" cy="49" rx="11" ry="8" transform="rotate(-20 51 49)" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>',
      heart: '<path d="M40 67C28 56 10 44 10 28c0-20 25-25 30-9 5-16 30-11 30 9 0 16-18 28-30 39z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2.5"/>',
      basket: '<path d="m14 32 7 31h39l7-31z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3" stroke-linejoin="round"/><path d="m25 32 9-17m22 17-9-17M16 42h49M29 34v27m14-27v27m12-27v27" fill="none" stroke="' + stroke + '" stroke-width="3" stroke-linecap="round"/>',
      hanger: '<path d="M33 20c0-15 21-14 21 0 0 8-14 9-14 17L12 55q-5 7 4 8h48q9-1 4-8L40 37" fill="none" stroke="' + stroke + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
    };
    return svg(shapes[name] || shapes.star);
  }

  function clothing(item) {
    var outline = ' stroke="#514463" stroke-width="2.5" stroke-linejoin="round"';
    var shape;
    if (item.type === 'sock') {
      shape = '<path d="M26 10h29v34l11 9c14 15-2 25-15 18L20 54q-7-4-5-13l8-28z" fill="' + item.color + '"' + outline + '/><path d="M24 21h31M19 42q12 0 14 17" fill="none"' + outline + '/>';
    } else if (item.type === 'bib') {
      shape = '<path d="M23 12h12c-9 13 19 13 10 0h12l10 32c8 35-62 35-54 0z" fill="' + item.color + '"' + outline + '/><path d="M23 12q-1 27 17 27t17-27" fill="none"' + outline + '/>';
    } else if (item.type === 'hat') {
      shape = '<path d="M16 55C8 8 65 5 64 55z" fill="' + item.color + '"' + outline + '/><rect x="11" y="50" width="58" height="16" rx="5" fill="#fff4df"' + outline + '/><circle cx="40" cy="12" r="8" fill="#fff4df"' + outline + '/>';
    } else {
      shape = '<path d="m25 12-17 17 13 12 7-7-2 29 9 8 5-8 5 8 9-8-2-29 7 7 13-12-17-17-5 8H30z" fill="' + item.color + '"' + outline + '/><path d="M29 12q10 16 22 0M34 58h12" fill="none"' + outline + '/>';
    }
    var pattern = item.pattern === 'dots'
      ? '<g fill="#fff8ee"><circle cx="36" cy="44" r="3"/><circle cx="47" cy="44" r="3"/><circle cx="41" cy="53" r="3"/></g>'
      : item.pattern === 'stripe'
        ? '<path d="M31 43h19m-18 8h18" stroke="#fff8ee" stroke-width="4" stroke-linecap="round"/>'
        : '<path d="m41 38 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#fff8ee"/>';
    return svg(shape + pattern);
  }

  function person(index) {
    var skin = ['#edbc98', '#b87a58', '#f5d0ad', '#d6a078', '#9b624a', '#e7b798', '#c68864', '#e9bea5'][index % 8];
    var hair = ['#674936', '#413541', '#835c3d', '#4c3843', '#382c32', '#c38c4f', '#60402e', '#75503f'][index % 8];
    var shirt = COLORS[index % COLORS.length];
    var hairShape = index % 3 === 0
      ? '<path d="M15 42C6 7 74 4 65 44L54 30H25z" fill="' + hair + '"/>'
      : index % 3 === 1
        ? '<path d="M15 46V28c-1-26 49-27 50 0v18L52 24l-26 6z" fill="' + hair + '"/>'
        : '<path d="M13 43C7 7 67 2 68 35L50 26c-2 10-22 10-26 4l-4 16z" fill="' + hair + '"/>';
    return svg('<path d="M9 80c0-26 62-26 62 0" fill="' + shirt + '"/>' + hairShape + '<rect x="34" y="57" width="12" height="13" rx="5" fill="' + skin + '"/><ellipse cx="40" cy="39" rx="23" ry="25" fill="' + skin + '"/><path d="M17 33C12 5 63 7 64 31c-14-7-18-13-18-13S36 35 17 33z" fill="' + hair + '"/><circle cx="31" cy="41" r="2.2" fill="#45343b"/><circle cx="49" cy="41" r="2.2" fill="#45343b"/><path d="M33 51q7 6 14 0" fill="none" stroke="#754c48" stroke-width="2.5" stroke-linecap="round"/>' + (index % 4 === 2 ? '<g fill="none" stroke="#65506c" stroke-width="2"><circle cx="30" cy="41" r="8"/><circle cx="50" cy="41" r="8"/><path d="M38 41h4"/></g>' : ''), '0 0 80 84');
  }

  function shuffle(values) {
    var result = values.slice();
    for (var i = result.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = result[i]; result[i] = result[j]; result[j] = temp;
    }
    return result;
  }

  function noteByMidi(midi) {
    return NOTES.find(function (note) { return note.midi === Number(midi); }) || NOTES[0];
  }

  /* The narration is deliberately finite: every line is a bundled WevoLabs clip.
     Games demonstrate actions through visible objects; words are supplementary. */
  const V = {
    "sorting": "Hilf beim Bühnenoutfit. Suche das Teil mit derselben Farbe und demselben Zeichen.",
    "sortHelp": "Ziehe das passende Teil auf das Baby. Du kannst auch erst das Teil und dann das Baby antippen.",
    "sortWrong": "Fast. Vergleiche die Farbe und das kleine Zeichen noch einmal.",
    "sortRight": "Das passt! Jetzt trägt unser Baby dein Teil.",
    "sortDone": "Dein Bühnenoutfit ist fertig!",
    "counting": "Bereite unser Picknick vor. Sammle für jede Person einen Becher.",
    "countMissing": "Ein paar Becher stehen schon bereit. Sammle nur die fehlenden.",
    "countHelp": "Tippe auf den Becherstapel. Mit dem Pfeil legst du einen zurück.",
    "countServe": "Verteile die Becher. Tippe auf die Personen, die noch keinen haben.",
    "countShort": "Schau, wer noch wartet. Wir brauchen noch Becher.",
    "countExtra": "Auf dem Tablett sind noch Becher übrig. Lege sie zurück.",
    "countDone": "Jetzt hat jede Person genau einen Becher.",
    "music": "Hör die Klangfolge an. Spiele sie dann in derselben Reihenfolge.",
    "musicListen": "Die Band spielt vor. Schau auf die leuchtenden Instrumente.",
    "musicHelp": "Die Bilder zeigen die Reihenfolge. Spiele sie von links nach rechts.",
    "musicWrong": "Wir probieren es noch einmal. Du kannst die Klangfolge wieder hören.",
    "musicDone": "Ja! Die Klänge stehen in derselben Reihenfolge.",
    "compose": "Jetzt erfindest du dein eigenes kleines Lied.",
    "composeHelp": "Tippe auf die Klänge, die dir gefallen. Mit dem Pfeil löschst du den letzten. Dann kannst du dein Lied mitnehmen.",
    "shapes": "Pflanze jede Form in das passende Beet. Danach gießt du deine Blumen.",
    "shapeHelp": "Schau auf den Umriss. Suche das Beet mit derselben Form.",
    "shapeRotate": "Drehe die Form mit dem runden Pfeil, bis sie in das Beet passt.",
    "shapeWrong": "Die Form passt noch nicht. Schau auf den Rand und die Richtung.",
    "shapeWater": "Jetzt fehlt noch Wasser. Tippe auf die Gießkanne und dann auf dein Beet.",
    "shapeGrown": "Schau, deine Blume wächst!",
    "shapeDone": "Dein Formengarten blüht.",
    "memory": "Decke zwei Karten auf. Findest du zwei gleiche Bilder?",
    "memoryLook": "Schau dir die Bilder in Ruhe an. Tippe auf das Auge, wenn du anfangen möchtest.",
    "memoryShadow": "Finde zu jedem Bild seinen Schatten. Achte auf die Form.",
    "memoryWrong": "Schau dir die beiden Bilder in Ruhe an. Dann drehst du sie wieder um.",
    "memoryHelp": "Ich zeige dir ein Bildpaar. Tippe die beiden Karten an.",
    "memoryRight": "Diese beiden Bilder gehören zusammen!",
    "memoryDone": "Alle Bildpaare sind gefunden!",
    "patterns": "Welche Bilder fehlen in unserer Lichterkette? Führe das Muster weiter.",
    "patternHelp": "Schau von links nach rechts. Welche Bilder wiederholen sich?",
    "patternWrong": "Schau dir die Reihenfolge noch einmal an. Welches Bild kommt als Nächstes?",
    "patternLight": "Alle Laternen sind da. Tippe auf den Schalter und lass sie leuchten!",
    "patternDone": "Deine Musterkette ist fertig!",
    "next": "Tippe auf den großen Pfeil. Dann geht es weiter.",
    "finish": "Tippe auf das Haus, um zurück in unsere Welt zu gehen."
};
  const FORMS = [
    {id:'circle',label:'Kreis',color:'#ff85c2'},
    {id:'triangle',label:'Dreieck',color:'#53ded3'},
    {id:'square',label:'Quadrat',color:'#ffc866'},
    {id:'rectangle',label:'Rechteck',color:'#b6a1ff'},
    {id:'hexagon',label:'Sechseck',color:'#70baff'}
  ];
  const PICTURES = [
    {id:'sun',label:'Sonne',color:'#ffca63'},{id:'cloud',label:'Wolke',color:'#84c8ff'},
    {id:'flower',label:'Blume',color:'#fa85bf'},{id:'star',label:'Stern',color:'#bba1ff'},
    {id:'moon',label:'Mond',color:'#70d7c6'},{id:'heart',label:'Herz',color:'#ff83a8'}
  ];
  const CATALOG = [
    {id:'sorting',title:'Backstage-Atelier',icon:'hanger',skill:'Farbe, Form und Muster kombinieren'},
    {id:'counting',title:'Picknick-Café',icon:'basket',skill:'Mengen bilden, ergänzen und verteilen'},
    {id:'music',title:'Unsere Mini-Band',icon:'music',skill:'Klangfolgen merken und Melodien erfinden'},
    {id:'shapes',title:'Neon-Blumengarten',icon:'flower',skill:'Formen drehen, zuordnen und pflanzen'},
    {id:'memory',title:'Bühnen-Bildpaare',icon:'heart',skill:'Bilder, Schatten und Positionen merken'},
    {id:'patterns',title:'Lichterketten-Labor',icon:'star',skill:'Wiederholungen erkennen und Lücken ergänzen'}
  ];
  const CLOTH_COLORS = ['#9e77ed','#ff77ad','#48cabd','#ffc264'];
  const MOTIFS = ['star','dots','stripe'];
  const svgCache = new Map();
  function glyph(name,color) {
    const ink = color || 'currentColor';
    const extra = {
      plus:'<path d="M40 18v44M18 40h44"/>',minus:'<path d="M18 40h44"/>',
      rotate:'<path d="M18 34a24 24 0 1 1 3 22M17 17v20h20"/>',
      eye:'<path d="M8 40q32-38 64 0Q40 78 8 40Z"/><circle cx="40" cy="40" r="10"/>',
      home:'<path d="m9 37 31-26 31 26M19 33v34h42V33M33 67V47h14v20"/>',
      hand:'<path d="M29 46V20c0-9 12-9 12 0v20-12c0-8 12-8 12 0v14-8c0-8 11-8 11 0v16c0 18-9 23-21 23-10 0-16-8-24-18-7-8 0-17 7-10l7 7"/>',
      water:'<path d="M16 33h33v29H16zM49 41l17-17 5 7-22 22M17 39C0 21 13 13 29 25M38 33V18h14v15M65 42l-2 7m9-4-2 7"/>',
      power:'<path d="M40 11v29M24 22a27 27 0 1 0 32 0"/>',
      target:'<circle cx="40" cy="40" r="27"/><circle cx="40" cy="40" r="13"/><path d="M40 4v12m0 48v12M4 40h12m48 0h12"/>',
      drum:'<ellipse cx="40" cy="35" rx="27" ry="12"/><path d="M13 35v26q27 21 54 0V35M20 44l9 25 11-24 11 24 9-25M16 10l23 15m24-16L43 25"/>'
    };
    return extra[name] ? svg('<g fill="none" stroke="'+ink+'" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">'+extra[name]+'</g>') : icon(name,color);
  }
  function formArt(id,color,outline,rotation) {
    const paths={circle:'<circle cx="40" cy="40" r="27"',triangle:'<path d="M40 9 71 67H9Z"',square:'<rect x="14" y="14" width="52" height="52" rx="4"',rectangle:'<rect x="8" y="23" width="64" height="34" rx="4"',hexagon:'<path d="M24 12h32l16 28-16 28H24L8 40Z"'};
    return svg('<g transform="rotate('+(rotation||0)+' 40 40)">'+(paths[id]||paths.circle)+' fill="'+(outline?'#faf6ff':color)+'" stroke="'+(outline?'#a798be':'#473355')+'" stroke-width="3"'+(outline?' stroke-dasharray="6 4"':'')+'/></g>');
  }
  function motifArt(pattern,color) {
    return pattern==='dots'?svg('<g fill="'+(color||'#6d4ab0')+'"><circle cx="25" cy="28" r="9"/><circle cx="56" cy="28" r="9"/><circle cx="40" cy="55" r="9"/></g>'):pattern==='stripe'?svg('<path d="M15 26h50M15 43h50M15 60h50" stroke="'+(color||'#6d4ab0')+'" stroke-width="10" stroke-linecap="round"/>'):icon('star',color||'#6d4ab0');
  }
  function rr(c,x,y,w,h,r,fill,stroke) {
    r=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}
  }
  function ellipse(c,x,y,rx,ry,fill) {c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
  function line(c,points,color,width) {c.beginPath();c.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(p=>c.lineTo(p[0],p[1]));c.strokeStyle=color;c.lineWidth=width||3;c.lineCap='round';c.lineJoin='round';c.stroke();}
  function star(c,x,y,r,color) {c.beginPath();for(let i=0;i<10;i++){let a=i*Math.PI/5-Math.PI/2,d=i%2?r*.44:r;i?c.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d):c.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}c.closePath();c.fillStyle=color;c.fill();}
  function paintSVG(c,source,x,y,w,h,alpha) {
    let image=svgCache.get(source);if(!image){image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source);svgCache.set(source,image);}
    if(image.complete && image.naturalWidth){c.save();c.globalAlpha=alpha==null?1:alpha;c.drawImage(image,x,y,w,h);c.restore();}
  }
  function pill(action,symbol,label,attrs,cls) {
    return '<button type="button" class="mg-tool '+(cls||'')+'" data-action="'+action+'" aria-label="'+escapeText(label)+'" '+(attrs||'')+'>'+glyph(symbol)+'<span>'+escapeText(label)+'</span></button>';
  }
  function modRotation(shape,n) {return shape==='circle'?0:shape==='square'?n%90:shape==='hexagon'?n%60:shape==='rectangle'?n%180:n%360;}
  function randomPick(values) {return values[Math.floor(Math.random()*values.length)];}
  function ease(n) {return n<.5?2*n*n:1-Math.pow(-2*n+2,2)/2;}

  class Session {
    constructor(type,options) {
      this.type=type;this.options=options;this.container=options.container;
      this.difficulty=Math.max(1,Math.min(3,Math.round(Number(options.difficulty)||1)));
      this.id='mg-'+(++instanceId);this.reducedMotion=!!options.reducedMotion;
      this.disposed=false;this.paused=false;this.assisted=false;this.mistakes=0;this.completed=0;this.round=0;
      this.phase='playing';this.tasks=new Map();this.taskId=0;this.audioStops=new Set();this.animations=new Set();this.clock=0;this.playing=false;
      this.previousFocus=document.activeElement;this.state={};this.lastFrame=0;this.lastPaint=0;this.transition=null;this.suppressClickUntil=0;
      this.boundClick=e=>this.handleClick(e);this.boundDown=e=>this.pointerDown(e);this.boundMove=e=>this.pointerMove(e);this.boundUp=e=>this.pointerUp(e);this.boundCancel=()=>this.cancelDrag();
      this.boundKey=e=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();this.close();}};
      this.mount();this.startRound();this.loop=this.loop.bind(this);this.frame=requestAnimationFrame(this.loop);
    }
    speak(key) {const text=V[key]||key;if(!this.paused&&!this.disposed&&this.options.speak){try{const p=this.options.speak(text);if(p&&p.catch)p.catch(()=>{});}catch(_){}}}
    sound(midi) {if(this.paused||this.disposed||!this.options.sound)return;try{let stop=this.options.sound(midi);if(typeof stop==='function')this.audioStops.add(stop);}catch(_){}}
    defer(fn,ms,playback) {let id=++this.taskId;this.tasks.set(id,{at:this.clock+ms,fn,playback:!!playback});return id;}
    stopPlayback() {for(const [id,t] of this.tasks)if(t.playback)this.tasks.delete(id);this.audioStops.forEach(stop=>{try{stop();}catch(_){}});this.audioStops.clear();this.playing=false;this.sounding=null;if(this.wrapper)this.wrapper.querySelectorAll('.is-sounding').forEach(x=>x.classList.remove('is-sounding'));}
    mount() {
      const meta=CATALOG.find(x=>x.id===this.type);
      this.wrapper=document.createElement('section');this.wrapper.className='mg-game mg-'+this.type+(this.reducedMotion?' mg-reduced-motion':'');this.wrapper.lang='de';
      this.wrapper.setAttribute('role','dialog');this.wrapper.setAttribute('aria-modal','true');this.wrapper.setAttribute('aria-labelledby',this.id+'-title');
      this.wrapper.innerHTML='<header class="mg-header"><span class="mg-heading-icon">'+icon(meta.icon)+'</span><div class="mg-heading"><span class="mg-eyebrow">STERNENBABY · SPIELWERKSTATT</span><h1 id="'+this.id+'-title">'+meta.title+'</h1></div><ol class="mg-progress" aria-label="Drei Spielrunden"></ol><div class="mg-header-tools">'+pill('repeat','sound','Noch einmal hören')+pill('help','hand','Zeig es mir')+pill('close','close','Zurück')+'</div></header><div class="mg-intro"><span class="mg-level" aria-label="Schwierigkeitsstufe '+this.difficulty+'">'+icon('star','#ffc264').repeat(this.difficulty)+'</span><p class="mg-instruction"></p></div><main class="mg-board"></main><footer class="mg-footer"><div class="mg-feedback" role="status" aria-live="polite"><span class="mg-feedback-icon">'+icon('heart','#ff8ab8')+'</span><p class="mg-feedback-message"></p></div><div class="mg-actions"></div></footer>';
      ['click','pointerdown','pointermove','pointerup','pointercancel','keydown'].forEach((event,i)=>this.wrapper.addEventListener(event,[this.boundClick,this.boundDown,this.boundMove,this.boundUp,this.boundCancel,this.boundKey][i]));
      this.container.replaceChildren(this.wrapper);this.container.classList.add('mg-mounted');this.board=this.wrapper.querySelector('.mg-board');this.actions=this.wrapper.querySelector('.mg-actions');
    }
    updateProgress() {this.wrapper.querySelector('.mg-progress').innerHTML=[0,1,2].map(i=>'<li class="'+(i<this.completed?'is-done':i===this.round?'is-current':'')+'" aria-label="Runde '+(i+1)+(i<this.completed?' fertig':'')+'">'+icon(i<this.completed?'check':'star',i<this.completed?'#6fddc6':'#c0b0df')+'</li>').join('');}
    instruction(key) {this.instructionKey=key;this.wrapper.querySelector('.mg-instruction').textContent=V[key];this.speak(key);}
    feedback(text,positive,voiceKey) {this.wrapper.querySelector('.mg-feedback-message').textContent=V[text]||text;this.wrapper.querySelector('.mg-feedback').classList.toggle('is-positive',!!positive);if(voiceKey)this.speak(voiceKey===true?text:voiceKey);}
    prepareBoard() {
      this.board.innerHTML='<section class="mg-stage"><canvas aria-hidden="true"></canvas><div class="mg-scene-caption"><span class="mg-scene-dot"></span><span>Gemeinsam kreativ</span></div><div class="mg-scene-overlay"></div></section><section class="mg-workspace"></section>';
      this.stage=this.board.querySelector('.mg-stage');this.canvas=this.stage.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.work=this.board.querySelector('.mg-workspace');this.sceneOverlay=this.stage.querySelector('.mg-scene-overlay');this.dirty=true;
    }
    startRound() {
      this.stopPlayback();this.tasks.clear();this.cancelDrag();this.transition=null;this.phase='playing';this.state={};this.actions.innerHTML='';this.prepareBoard();
      this['start'+this.type[0].toUpperCase()+this.type.slice(1)]();this.updateProgress();
    }
    loop(time) {
      if(this.disposed)return;const dt=this.lastFrame?Math.min(70,time-this.lastFrame):16;this.lastFrame=time;
      if(!this.paused){this.clock+=dt;for(const [id,t] of Array.from(this.tasks)){if(t.at<=this.clock){this.tasks.delete(id);if(!this.disposed&&!this.paused)t.fn();}}if(!this.disposed&&(this.dirty||time-this.lastPaint>32)){this.drawScene();this.lastPaint=time;this.dirty=false;}}
      if(!this.disposed)this.frame=requestAnimationFrame(this.loop);
    }
    animate(kind,duration,details,done) {this.transition=Object.assign({kind,start:this.clock,duration:this.reducedMotion?100:duration},details||{});this.dirty=true;const ref=this.transition;this.defer(()=>{if(this.transition===ref)this.transition=null;if(done)done();},ref.duration);}
    fly(source,target,html) {
      if(this.reducedMotion||!source||!target)return;
      let from=source.getBoundingClientRect(),to=target.getBoundingClientRect();if(!from.width||!to.width)return;
      let el=document.createElement('div');el.className='mg-flight';el.innerHTML=html;document.body.appendChild(el);Object.assign(el.style,{width:'72px',height:'72px',left:(from.left+from.width/2-36)+'px',top:(from.top+from.height/2-36)+'px'});
      const dx=to.left+to.width/2-from.left-from.width/2,dy=to.top+to.height/2-from.top-from.height/2;
      if(el.animate){const animation=el.animate([{transform:'translate(0,0) scale(.8)'},{transform:'translate('+(dx*.48)+'px,'+(dy*.48-50)+'px) scale(1.12)',offset:.5},{transform:'translate('+dx+'px,'+dy+'px) scale(.75)'}],{duration:580,easing:'ease-in-out',fill:'forwards'});this.animations.add(animation);animation.onfinish=()=>{this.animations.delete(animation);el.remove();};animation.oncancel=()=>el.remove();}
      else this.defer(()=>el.remove(),600);
    }
    pointerDown(event) {
      if(this.paused||this.disposed||event.button>0)return;
      let el=event.target.closest('[data-draggable]');if(!el||el.disabled||!this.wrapper.contains(el))return;
      this.drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,el,action:el.dataset.action,id:el.dataset.id,started:false};
    }
    pointerMove(event) {
      const d=this.drag;if(!d||d.pointer!==event.pointerId)return;
      if(!d.started&&Math.hypot(event.clientX-d.x,event.clientY-d.y)>9){d.started=true;this.wrapper.setPointerCapture(event.pointerId);d.ghost=document.createElement('div');d.ghost.className='mg-drag-ghost';d.ghost.innerHTML=d.el.querySelector('.mg-art')?.innerHTML||d.el.innerHTML;document.body.appendChild(d.ghost);d.el.classList.add('is-dragging');}
      if(d.started){event.preventDefault();d.ghost.style.left=(event.clientX-42)+'px';d.ghost.style.top=(event.clientY-42)+'px';}
    }
    pointerUp(event) {
      const d=this.drag;if(!d||d.pointer!==event.pointerId)return;
      if(d.started){this.suppressClickUntil=performance.now()+500;let target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-drop]');if(target&&this.wrapper.contains(target)){if(d.action==='select-sort'){this.selectSorting(d.id);this.placeSorting();}else if(d.action==='select-seed'){this.selectSeed(d.id);this.plantSeed(target.dataset.id);}else if(d.action==='pattern-choice'){this.state.activeHole=Number(target.dataset.position);this.choosePattern(d.id);}}}
      this.cancelDrag();
    }
    cancelDrag() {if(!this.drag)return;this.drag.el.classList.remove('is-dragging');if(this.drag.ghost)this.drag.ghost.remove();try{if(this.wrapper.hasPointerCapture(this.drag.pointer))this.wrapper.releasePointerCapture(this.drag.pointer);}catch(_){}this.drag=null;}

    startSorting() {
      const types=this.difficulty===1?['suit','hat']:this.difficulty===2?['suit','bib','hat']:['suit','bib','hat','sock'];
      const scheme=randomPick(CLOTH_COLORS);this.state.outfit={};this.state.goalIndex=0;this.state.matched=new Set();this.state.selected=null;this.state.busy=false;
      this.state.goals=types.map((type,i)=>({id:type+'-'+i,type,color:this.difficulty===1?scheme:randomPick(CLOTH_COLORS),pattern:randomPick(MOTIFS)}));
      this.makeWardrobe();this.instruction('sorting');this.feedback('sortHelp');this.renderSorting();
    }
    makeWardrobe() {
      const target=this.state.goals[this.state.goalIndex];if(!target)return;
      let candidates=[Object.assign({},target,{id:'choice-0',correct:true})];
      const variations=this.difficulty===1?[['color'],['type']]:this.difficulty===2?[['color'],['pattern'],['type']]:[['color'],['pattern'],['type'],['color','pattern'],['type','pattern']];
      variations.forEach((changes,i)=>{let item=Object.assign({},target,{id:'choice-'+(i+1)});changes.forEach(change=>{let pool=change==='color'?CLOTH_COLORS:change==='pattern'?MOTIFS:['suit','hat','bib','sock'];item[change]=randomPick(pool.filter(v=>v!==item[change]));});candidates.push(item);});
      this.state.items=shuffle(candidates);this.state.selected=null;this.state.hint=null;
    }
    renderSorting() {
      const s=this.state,target=s.goals[s.goalIndex]||s.goals[s.goals.length-1];
      const goal='<div class="mg-outfit-recipe"><span class="mg-recipe-icon">'+glyph('eye')+'</span><span class="mg-recipe-cloth">'+clothing(target)+'</span><span class="mg-recipe-detail" style="background:'+target.color+'" aria-label="Farbe"></span><span class="mg-recipe-detail">'+motifArt(target.pattern)+'</span><span class="mg-recipe-arrow">'+icon('arrow')+'</span><span class="mg-recipe-icon">'+glyph('hand')+'</span></div>';
      const stock=s.items.map(item=>'<button type="button" class="mg-item-card '+(s.selected===item.id?'is-selected ':'')+(s.hint===item.id?'is-hint':'')+'" data-action="select-sort" data-id="'+item.id+'" data-draggable="true" data-correct="'+!!item.correct+'" aria-label="'+escapeText(({suit:'Babybody',bib:'Lätzchen',hat:'Mütze',sock:'Socke'}[item.type])+', '+({'#9e77ed':'lila','#ff77ad':'rosa','#48cabd':'türkis','#ffc264':'gelb'}[item.color]||'bunt')+', '+({star:'mit Stern',dots:'mit Punkten',stripe:'mit Streifen'}[item.pattern]))+'" aria-pressed="'+(s.selected===item.id)+'" '+(s.busy||this.phase!=='playing'?'disabled':'')+'><span class="mg-art">'+clothing(item)+'</span></button>').join('');
      const progress=s.goals.map((g,i)=>'<span class="mg-garment-goal '+(i<s.goalIndex?'is-done':i===s.goalIndex?'is-current':'')+'">'+clothing(g)+(i<s.goalIndex?'<i>'+icon('check')+'</i>':'')+'</span>').join('');
      this.work.innerHTML=goal+'<div class="mg-wardrobe" style="--mg-stock:'+s.items.length+'">'+stock+'</div><div class="mg-outfit-progress" aria-label="Dein Outfit">'+progress+'</div>';
      this.sceneOverlay.innerHTML='<button class="mg-dress-target '+(s.selected?'is-ready':'')+'" data-action="place-sort" data-drop="outfit" aria-label="Ausgewähltes Teil anziehen" '+(s.busy||this.phase!=='playing'?'disabled':'')+'><span>'+glyph(s.busy?'star':'hand')+'</span></button>';
      this.dirty=true;
    }
    selectSorting(id) {if(this.phase!=='playing'||this.state.busy)return;let item=this.state.items.find(x=>x.id===id);if(!item)return;this.state.selected=id;this.state.hint=null;this.renderSorting();}
    placeSorting() {
      let s=this.state;if(this.phase!=='playing'||s.busy)return;let item=s.items.find(x=>x.id===s.selected);if(!item){this.speak('sortHelp');return;}
      if(!item.correct){this.mistakes++;this.feedback('sortWrong',false,true);this.work.querySelector('[data-id="'+item.id+'"]')?.classList.add('is-wiggle');return;}
      s.busy=true;const source=this.work.querySelector('[data-id="'+item.id+'"]');this.fly(source,this.sceneOverlay.querySelector('button'),clothing(item));this.animate('dress',760,{item},()=>{s.outfit[item.type]=item;s.matched.add(item.type);s.goalIndex++;s.busy=false;this.sound(72);if(s.goalIndex===s.goals.length){this.creation={type:'outfit',items:Object.values(s.outfit).map(x=>({type:x.type,color:x.color,pattern:x.pattern}))};this.renderSorting();this.markRoundDone('sortDone');}else{this.makeWardrobe();this.renderSorting();this.feedback('sortRight',true,true);}});this.renderSorting();
    }

    startCounting() {
      const pools={1:[2,3,4],2:[3,4,5,6],3:[5,6,7,8]};
      if(!this.countPlan)this.countPlan=shuffle(pools[this.difficulty]).slice(0,3);
      const people=this.countPlan[this.round];const prefilled=this.difficulty>1&&this.round>0?Math.min(this.round,people-1):0;
      this.state={people,served:new Set(shuffle(Array.from({length:people},(_,i)=>i)).slice(0,prefilled)),tray:0,mode:'collect',counted:[],busy:false,hint:null};
      this.instruction(prefilled?'countMissing':'counting');this.feedback('countHelp');this.renderCounting();
    }
    renderCounting() {
      const s=this.state;const people=Array.from({length:s.people},(_,i)=>'<button type="button" class="mg-person '+(s.served.has(i)?'is-served ':'')+(s.hint===i?'is-hint':'')+'" data-action="serve-person" data-person="'+i+'" aria-label="Person '+(i+1)+(s.served.has(i)?', hat einen Becher':', ohne Becher')+'" '+(this.phase!=='playing'||s.busy?'disabled':'')+'><span class="mg-person-avatar">'+person(i+this.round)+'</span><span class="mg-place">'+(s.served.has(i)?icon('cup',COLORS[i%COLORS.length]):'<i></i>')+'</span>'+(s.counted.includes(i)?'<span class="mg-count-badge">'+(s.counted.indexOf(i)+1)+'</span>':'')+'</button>').join('');
      const cups=Array.from({length:s.tray},(_,i)=>'<span>'+icon('cup',COLORS[i%COLORS.length])+'</span>').join('');
      this.work.innerHTML='<div class="mg-people-grid" style="--mg-people:'+Math.min(s.people,4)+'">'+people+'</div><div class="mg-counter"><button type="button" class="mg-cup-stack" data-action="add-cup" aria-label="Einen Becher nehmen" '+(s.tray>=8||this.phase!=='playing'?'disabled':'')+'><span class="mg-stack-cup">'+icon('cup','#9d7ae8')+'</span><span class="mg-plus">'+glyph('plus')+'</span></button><div class="mg-tray '+(s.mode==='serve'?'is-serving':'')+'" aria-label="Tablett mit '+s.tray+' Bechern"><div class="mg-cup-preview">'+(cups||'<span class="mg-tray-dot"></span>')+'</div><span class="mg-tray-count">'+s.tray+'</span></div>'+pill('remove-cup','back','Einen Becher zurücklegen',s.tray===0||this.phase!=='playing'?'disabled':'')+'</div>';
      this.actions.innerHTML=this.phase==='playing'?pill('serve-mode',s.mode==='collect'?'arrow':'check',s.mode==='collect'?'Becher verteilen':'Nachschauen','', 'mg-primary'):this.actions.innerHTML;
      this.dirty=true;
    }
    addCup() {if(this.phase!=='playing'||this.state.tray>=8||this.state.busy)return;this.state.tray++;this.sound(60+this.state.tray);this.renderCounting();this.speak(NUMBERS[this.state.tray]);}
    removeCup() {if(this.phase!=='playing'||!this.state.tray||this.state.busy)return;this.state.tray--;this.renderCounting();if(this.state.tray)this.speak(NUMBERS[this.state.tray]);if(this.state.mode==='serve')this.checkCountFinish();}
    serveMode() {if(this.phase!=='playing')return;this.state.mode='serve';this.renderCounting();if(!this.checkCountFinish())this.feedback(this.state.tray?'countServe':'countShort',false,true);}
    servePerson(index) {
      const s=this.state;if(this.phase!=='playing'||s.busy||index<0||index>=s.people)return;
      if(s.mode==='collect'){if(!s.counted.includes(index))s.counted.push(index);this.speak(NUMBERS[s.counted.indexOf(index)+1]);this.renderCounting();return;}
      if(s.served.has(index))return;if(!s.tray){this.feedback('countShort',false,true);return;}
      const target=this.work.querySelector('[data-person="'+index+'"]');this.fly(this.work.querySelector('.mg-tray'),target,icon('cup',COLORS[index%COLORS.length]));s.busy=true;
      this.animate('serve',600,{person:index},()=>{s.busy=false;s.tray--;s.served.add(index);s.hint=null;this.sound(67);this.renderCounting();this.checkCountFinish();});
    }
    checkCountFinish() {
      const s=this.state;if(s.served.size===s.people&&s.tray===0){this.creation={type:'picnic',guests:s.people};this.markRoundDone('countDone');return true;}
      if(s.served.size===s.people&&s.tray>0){this.feedback('countExtra',false,true);return false;}
      return false;
    }

    availableNotes() {return this.phase==='compose'?NOTES:this.difficulty===1?[NOTES[0],NOTES[2],NOTES[3]]:this.difficulty===2?NOTES.slice(0,4):NOTES;}
    startMusic() {
      const n=this.difficulty+1+(this.difficulty>1&&this.round===2?1:0),available=this.availableNotes();const target=[];
      for(let i=0;i<n;i++)target.push(randomPick(available.filter(x=>x.midi!==target[i-1])).midi);
      this.state={target,input:[],revealed:this.difficulty===1,attempts:0};this.instruction('music');this.feedback('musicListen');this.renderMusic();
    }
    noteStrip(values,length,concealed,className) {return '<div class="mg-note-strip '+(className||'')+'">'+Array.from({length},(_,i)=>{let note=noteByMidi(values[i]);return '<span class="mg-note-token '+(values[i]!=null?'is-filled':'')+'" data-note-position="'+i+'" data-note="'+(values[i]||'')+'">'+(values[i]!=null&&!concealed?icon(note.symbol,note.color):'<i></i>')+'</span>';}).join('')+'</div>';}
    renderMusic() {
      const s=this.state,compose=this.phase==='compose';
      let head=compose?'<div class="mg-score">'+this.noteStrip(s.composition,8,false,'mg-composition-notes')+'<div class="mg-score-tools">'+pill('hear-composition','play','Mein Lied hören',s.composition.length?'':'disabled')+pill('undo-note','back','Letzten Ton entfernen',s.composition.length?'':'disabled')+'</div></div>':'<div class="mg-score"><div class="mg-score-row">'+pill('hear-melody','play','Band anhören')+this.noteStrip(s.target,s.target.length,!s.revealed,'mg-target-strip')+'</div><div class="mg-score-row"><span class="mg-your-turn">'+glyph('hand')+'</span>'+this.noteStrip(s.input,s.target.length,false,'mg-input-strip')+pill('clear-note','back','Noch einmal spielen',s.input.length&&this.phase==='playing'?'':'disabled')+'</div></div>';
      const keys=this.availableNotes().map((note,i)=>'<button type="button" class="mg-note-key" data-action="note" data-note="'+note.midi+'" aria-label="'+note.label+'" style="--mg-key:'+note.color+';--mg-key-index:'+i+'" '+(this.phase==='roundDone'||this.playing?'disabled':'')+'><span class="mg-art">'+icon(note.symbol,note.color)+'</span><span class="mg-key-groove"></span></button>').join('');
      this.work.innerHTML=head+'<div class="mg-keyboard" style="--mg-key-count:'+this.availableNotes().length+'">'+keys+'</div>';
      if(compose)this.actions.innerHTML=pill('finish-music','home','Lied mitnehmen','','mg-primary');else if(this.phase==='playing')this.actions.innerHTML=pill('check-music','check','Klangfolge vergleichen',s.input.length!==s.target.length||this.playing?'disabled':'','mg-primary');this.dirty=true;
    }
    playSequence(sequence,target) {
      if(!sequence||!sequence.length)return;this.stopPlayback();this.playing=true;this.renderMusic();this.feedback('musicListen',false,false);
      sequence.forEach((midi,index)=>this.defer(()=>{this.sounding={midi,at:this.clock};this.wrapper.querySelectorAll('.is-sounding').forEach(x=>x.classList.remove('is-sounding'));this.wrapper.querySelector('[data-action="note"][data-note="'+midi+'"]')?.classList.add('is-sounding');const strip=target?'.mg-target-strip':'.mg-composition-notes';this.wrapper.querySelector(strip+' [data-note-position="'+index+'"]')?.classList.add('is-sounding');this.sound(midi);this.dirty=true;},index*620+220,true));
      this.defer(()=>{this.stopPlayback();this.renderMusic();this.feedback('Jetzt du! Deine Instrumente sind bereit.');},sequence.length*620+250,true);
    }
    pressNote(midi) {
      if(!['playing','compose'].includes(this.phase)||this.playing||!this.availableNotes().some(n=>n.midi===midi))return;let notes=this.phase==='compose'?this.state.composition:this.state.input;let limit=this.phase==='compose'?8:this.state.target.length;if(notes.length>=limit)return;
      notes.push(midi);this.sound(midi);this.sounding={midi,at:this.clock};this.renderMusic();this.wrapper.querySelector('[data-note="'+midi+'"][data-action="note"]')?.classList.add('is-sounding');this.defer(()=>this.wrapper.querySelectorAll('.is-sounding').forEach(x=>x.classList.remove('is-sounding')),320);if(this.phase==='playing'&&notes.length===limit)this.feedback('Deine Klangfolge ist bereit. '+String.fromCharCode(10003));
    }
    checkMusic() {
      if(this.phase!=='playing'||this.playing||this.state.input.length!==this.state.target.length)return;
      if(this.state.input.every((midi,i)=>midi===this.state.target[i])){this.lastMelody=this.state.target.slice();this.animate('band',1300,{},()=>{});this.markRoundDone('musicDone');this.renderMusic();}
      else{this.mistakes++;this.state.attempts++;this.state.input=[];if(this.state.attempts>=2){this.state.revealed=true;this.assisted=true;}this.renderMusic();this.feedback('musicWrong',false,true);}
    }

    startShapes() {
      const available=this.difficulty===1?FORMS.slice(0,3):FORMS;
      let chosen=shuffle(available).slice(0,this.difficulty+2);
      if(this.difficulty===3)chosen=[FORMS[1],FORMS[3],...shuffle([FORMS[0],FORMS[2],FORMS[4]])];
      this.state={seeds:shuffle(chosen),beds:shuffle(chosen),rotations:{},bedRotations:{},planted:new Set(),grown:new Set(),selected:null,watering:false,busy:false,hint:null};
      chosen.forEach(s=>{this.state.bedRotations[s.id]=this.difficulty===3&&['triangle','rectangle'].includes(s.id)?randomPick([0,90,180,270]):0;this.state.rotations[s.id]=this.difficulty===3&&['triangle','rectangle'].includes(s.id)?(this.state.bedRotations[s.id]+90)%360:0;});
      this.instruction('shapes');this.feedback('shapeHelp');this.renderShapes();
    }
    renderShapes() {
      const s=this.state;
      const beds=s.beds.map(form=>'<button type="button" class="mg-garden-bed '+(s.planted.has(form.id)?'is-planted ':'')+(s.grown.has(form.id)?'is-grown ':'')+(s.justGrown===form.id?'is-fresh ':'')+(s.hint===form.id?'is-hint ':'')+(s.watering&&s.planted.has(form.id)&&!s.grown.has(form.id)?'needs-water':'')+'" data-action="plant-seed" data-drop="shape" data-id="'+form.id+'" data-rotation="'+s.bedRotations[form.id]+'" aria-label="'+form.label+(s.grown.has(form.id)?', Blume wächst':s.planted.has(form.id)?', braucht Wasser':', leeres Beet')+'" '+(s.busy||s.grown.has(form.id)||this.phase!=='playing'?'disabled':'')+'><span class="mg-bed-art">'+(s.grown.has(form.id)?icon('flower',form.color):formArt(form.id,s.planted.has(form.id)?form.color:'#ded3ee',!s.planted.has(form.id),s.bedRotations[form.id]))+'</span><span class="mg-bed-soil"></span>'+(s.planted.has(form.id)&&!s.grown.has(form.id)?'<span class="mg-water-badge">'+glyph('water')+'</span>':'')+'</button>').join('');
      const seeds=s.seeds.map(form=>'<button type="button" class="mg-seed '+(s.selected===form.id?'is-selected':'')+'" data-action="select-seed" data-id="'+form.id+'" data-draggable="true" data-rotation="'+s.rotations[form.id]+'" aria-label="'+form.label+' auswählen" '+(s.busy||s.planted.has(form.id)||this.phase!=='playing'?'disabled':'')+'><span class="mg-art">'+formArt(form.id,form.color,false,s.rotations[form.id])+'</span></button>').join('');
      this.work.innerHTML='<div class="mg-garden-grid" style="--mg-beds:'+Math.min(3,s.beds.length)+'">'+beds+'</div><div class="mg-seed-tray">'+seeds+'</div><div class="mg-garden-tools">'+(this.difficulty===3?pill('rotate-seed','rotate','Form drehen',!s.selected||s.busy?'disabled':''):'')+pill('water-tool','water','Gießkanne',s.planted.size===s.grown.size||s.busy?'disabled':'',s.watering?'is-selected':'')+'</div>';
      this.dirty=true;
    }
    selectSeed(id) {if(this.phase!=='playing'||this.state.busy||this.state.planted.has(id)||!this.state.seeds.some(x=>x.id===id))return;this.state.selected=id;this.state.justGrown=null;this.state.watering=false;this.state.hint=null;this.renderShapes();}
    plantSeed(id) {
      const s=this.state;if(this.phase!=='playing'||s.busy||!s.beds.some(f=>f.id===id)||s.grown.has(id))return;
      if(s.planted.has(id)){if(s.watering)this.waterBed(id);else this.feedback('shapeWater',false,true);return;}
      if(!s.selected){this.speak('shapeHelp');return;}
      if(s.selected!==id||modRotation(id,s.rotations[id])!==modRotation(id,s.bedRotations[id])){this.mistakes++;this.feedback(s.selected===id?'shapeRotate':'shapeWrong',false,true);this.work.querySelector('[data-action="plant-seed"][data-id="'+id+'"]')?.classList.add('is-wiggle');return;}
      const form=s.seeds.find(f=>f.id===id);this.fly(this.work.querySelector('[data-action="select-seed"][data-id="'+id+'"]'),this.work.querySelector('[data-action="plant-seed"][data-id="'+id+'"]'),formArt(id,form.color,false,s.rotations[id]));s.busy=true;
      this.animate('plant',620,{id},()=>{s.planted.add(id);s.selected=null;s.busy=false;this.sound(67);this.renderShapes();this.feedback('shapeWater',true,true);});
    }
    waterBed(id) {
      const s=this.state;s.busy=true;s.justGrown=null;this.renderShapes();this.animate('water',1500,{id},()=>{s.grown.add(id);s.justGrown=id;s.busy=false;this.sound(76);if(s.grown.size===s.seeds.length){this.creation={type:'garden',flowers:s.beds.map(f=>f.id)};this.renderShapes();this.markRoundDone('shapeDone');}else{this.renderShapes();this.feedback('shapeGrown',true,true);}});
    }

    startMemory() {
      const count=this.difficulty+2,chosen=shuffle(PICTURES).slice(0,count);
      this.state={cards:shuffle(chosen.flatMap(p=>[Object.assign({},p,{shadow:false}),Object.assign({},p,{shadow:this.difficulty===3})])),open:[],matched:new Set(),hints:[],waiting:false,preview:true,justFlipped:-1};
      this.instruction(this.difficulty===3?'memoryShadow':'memory');this.feedback('memoryLook',false,true);this.renderMemory();
    }
    renderMemory() {
      const s=this.state;
      const cards=s.cards.map((p,i)=>{const matched=s.matched.has(p.id),show=s.preview||matched||s.open.includes(i);return '<button type="button" class="mg-memory-card '+(show?'is-open ':'')+(matched?'is-matched ':'')+(s.hints.includes(i)?'is-hint ':'')+(s.justFlipped===i?'is-flipping':'')+'" data-action="memory-card" data-card="'+i+'" data-picture="'+p.id+'" aria-label="'+(show?p.label+(p.shadow?', Schatten':''):'Bildkarte '+(i+1))+'" aria-pressed="'+show+'" '+(matched||s.preview||this.phase!=='playing'?'disabled':'')+'><span class="mg-card-back">'+icon('star','#ba92ff')+'</span><span class="mg-card-front '+(p.shadow?'is-shadow':'')+'">'+icon(p.id,p.color)+'</span>'+(matched?'<span class="mg-card-check">'+icon('check')+'</span>':'')+'</button>';}).join('');
      const found=Array.from({length:s.cards.length/2},(_,i)=>'<span class="'+(i<s.matched.size?'is-found':'')+'">'+icon('heart',i<s.matched.size?'#ff8dba':'#d4cae4')+'</span>').join('');
      this.work.innerHTML='<div class="mg-memory-found">'+found+'</div><div class="mg-memory-grid" style="--mg-memory-cols:'+(s.cards.length===6?3:s.cards.length===10?5:4)+'">'+cards+'</div>';
      if(this.phase==='playing')this.actions.innerHTML=s.preview?pill('memory-start','eye','Bilder merken und beginnen','','mg-primary'):s.waiting?pill('memory-again','back','Karten wieder umdrehen','','mg-primary'):'';this.dirty=true;
    }
    flipCard(index) {
      const s=this.state;if(this.phase!=='playing'||s.preview||s.waiting||index<0||index>=s.cards.length||s.open.includes(index)||s.matched.has(s.cards[index].id))return;s.open.push(index);s.justFlipped=index;this.sound(s.open.length===1?64:67);
      if(s.open.length===2){let a=s.cards[s.open[0]],b=s.cards[s.open[1]];if(a.id===b.id){s.matched.add(a.id);s.open=[];s.hints=[];this.animate('pair',1000,{picture:a},()=>{});this.renderMemory();if(s.matched.size===s.cards.length/2){this.creation={type:'memory',pictures:Array.from(s.matched)};this.markRoundDone('memoryDone');}else this.feedback('memoryRight',true,true);}else{this.mistakes++;s.waiting=true;s.hints=[];this.renderMemory();this.feedback('memoryWrong',false,true);}}else{this.renderMemory();this.feedback('Wo liegt das zweite Bild?');}
    }

    startPatterns() {
      let pics=shuffle(PICTURES),templates=this.difficulty===1?[[0,1]]:this.difficulty===2?[[0,0,1],[0,1,1],[0,1,2]]:[[0,1,0,2],[0,0,1],[0,1,2]];
      let template=randomPick(templates),unit=template.map(i=>pics[i]);let base=unit.concat(unit);let goal=this.difficulty===1?2:this.difficulty===2?3:4;
      let extension=Array.from({length:goal},()=>null),sequence=base.concat(extension);
      this.state={unit,sequence,baseLength:base.length,goal,added:0,choices:shuffle(pics.slice(0,this.difficulty===1?2:this.difficulty===2?3:4)),activeHole:base.length,hint:null,lit:false,busy:false};
      // In the highest level one visible clue within the extension separates gaps.
      if(this.difficulty===3){sequence.push(unit[sequence.length%unit.length],null);this.state.goal++;}
      this.instruction('patterns');this.feedback('patternHelp');this.renderPatterns();
    }
    patternExpected() {return this.state.unit[this.state.activeHole%this.state.unit.length];}
    renderPatterns() {
      const s=this.state;const slots=s.sequence.map((p,i)=>p?'<span class="mg-pattern-token '+(i>=s.baseLength?'is-added':'')+'" data-pattern-position="'+i+'" style="--mg-lantern:'+p.color+'">'+icon(p.id,p.color)+'</span>':'<button type="button" class="mg-pattern-token mg-pattern-empty '+(i===s.activeHole?'is-current':'')+'" data-action="pattern-hole" data-drop="pattern" data-position="'+i+'" aria-label="Fehlende Laterne '+(i+1)+'" '+(this.phase!=='playing'||s.busy?'disabled':'')+'><span>'+glyph('target')+'</span></button>').join('');
      const choices=s.choices.map(p=>'<button type="button" class="mg-pattern-choice '+(s.hint===p.id?'is-hint':'')+'" data-action="pattern-choice" data-id="'+p.id+'" data-draggable="true" aria-label="'+p.label+' einsetzen" '+(this.phase!=='playing'||s.busy||s.activeHole<0?'disabled':'')+'><span class="mg-art">'+icon(p.id,p.color)+'</span></button>').join('');
      this.work.innerHTML='<div class="mg-pattern-guide" aria-label="Diese Gruppe wiederholt sich">'+glyph('eye')+'<span>'+s.unit.map(p=>icon(p.id,p.color)).join('')+'</span>'+icon('arrow')+'</div><div class="mg-pattern-string" style="--mg-pattern-cols:'+(s.sequence.length>12?7:6)+'">'+slots+'</div><div class="mg-pattern-choices">'+choices+'</div>';
      if(this.phase==='playing')this.actions.innerHTML=s.activeHole<0?pill('light-pattern','power','Lichter einschalten',s.busy?'disabled':'','mg-primary'):'';this.dirty=true;
    }
    choosePattern(id) {
      const s=this.state;if(this.phase!=='playing'||s.activeHole<0||s.busy)return;let expected=this.patternExpected();
      if(id!==expected.id){this.mistakes++;this.feedback('patternWrong',false,true);return;}
      const position=s.activeHole;this.fly(this.work.querySelector('[data-action="pattern-choice"][data-id="'+id+'"]'),this.work.querySelector('[data-position="'+position+'"]'),icon(expected.id,expected.color));s.busy=true;
      this.animate('lantern',580,{picture:expected,position},()=>{s.sequence[position]=expected;s.added++;s.activeHole=s.sequence.findIndex(p=>!p);s.hint=null;s.busy=false;this.sound(60+(s.added%5)*2);this.renderPatterns();if(s.activeHole<0)this.feedback('patternLight',true,true);});
    }
    lightPattern() {if(this.phase!=='playing'||this.state.activeHole>=0||this.state.busy)return;this.state.busy=true;this.state.lit=true;this.renderPatterns();this.animate('light',1800,{},()=>{this.state.busy=false;this.creation={type:'pattern',symbols:this.state.sequence.map(p=>p.id)};this.markRoundDone('patternDone');this.renderPatterns();});}

    markRoundDone(key) {if(this.phase!=='playing')return;this.phase='roundDone';this.completed++;this.updateProgress();this.work.querySelectorAll('button').forEach(b=>b.disabled=true);this.sceneOverlay.querySelectorAll('button').forEach(b=>{b.disabled=true;b.classList.remove('is-ready');});this.feedback(key,true,true);this.actions.innerHTML=pill('next',this.completed<3?'arrow':this.type==='music'?'music':'check',this.completed<3?'Weiter':this.type==='music'?'Eigenes Lied erfinden':'Geschafft','','mg-primary');this.wrapper.classList.add('mg-success');this.defer(()=>this.wrapper.classList.remove('mg-success'),1200);this.dirty=true;}
    next() {if(this.phase!=='roundDone')return;if(this.completed<3){this.round++;this.startRound();}else if(this.type==='music'){this.phase='compose';this.state={composition:(this.lastMelody||[60,64,67]).slice()};this.instruction('compose');this.feedback('composeHelp');this.renderMusic();}else this.showCompletion();}
    showCompletion() {
      this.stopPlayback();this.phase='finished';const meta=CATALOG.find(x=>x.id===this.type);this.work.innerHTML='<div class="mg-completion"><div class="mg-completion-medal">'+icon(meta.icon,'#ffbf69')+'</div><div class="mg-completion-stars">'+icon('star','#ffce70').repeat(3)+'</div><h2>Dein Werk ist fertig!</h2><p>'+meta.skill+'</p></div>';this.sceneOverlay.innerHTML='';this.actions.innerHTML=pill('finish','home','Zurück in unsere Welt','','mg-primary');this.feedback('finish',true,true);this.dirty=true;
    }
    help() {
      this.assisted=true;
      if(this.phase==='finished'){this.speak('finish');return;}if(this.phase==='roundDone'){this.speak('next');return;}
      const s=this.state;
      if(this.type==='sorting'){if(s.busy)return;let item=s.items.find(i=>i.correct);s.selected=item.id;s.hint=item.id;this.renderSorting();this.feedback('sortHelp',false,true);this.demo(this.work.querySelector('[data-id="'+item.id+'"]'),this.sceneOverlay.querySelector('button'));}
      else if(this.type==='counting'){if(s.mode==='collect'){s.counted=Array.from({length:s.people},(_,i)=>i);this.renderCounting();this.feedback('countHelp',false,true);this.work.querySelector('[data-action="add-cup"]')?.classList.add('is-hint');}else{s.hint=Array.from({length:s.people},(_,i)=>i).find(i=>!s.served.has(i));this.renderCounting();this.feedback(s.tray?'countServe':'countShort',false,true);}}
      else if(this.type==='music'){if(this.phase==='compose'){this.speak('composeHelp');return;}this.stopPlayback();s.revealed=true;this.renderMusic();this.feedback('musicHelp',false,true);}
      else if(this.type==='shapes'){if(s.busy)return;let planted=s.beds.find(f=>s.planted.has(f.id)&&!s.grown.has(f.id));if(planted){s.watering=true;s.hint=planted.id;this.renderShapes();this.feedback('shapeWater',false,true);}else{let form=s.seeds.find(f=>f.id===s.selected)||s.seeds.find(f=>!s.planted.has(f.id));if(!form)return;s.selected=form.id;s.hint=form.id;this.renderShapes();this.feedback(modRotation(form.id,s.rotations[form.id])!==modRotation(form.id,s.bedRotations[form.id])?'shapeRotate':'shapeHelp',false,true);this.demo(this.work.querySelector('[data-action="select-seed"][data-id="'+form.id+'"]'),this.work.querySelector('[data-action="plant-seed"][data-id="'+form.id+'"]'));}}
      else if(this.type==='memory'){if(s.preview){this.speak('memoryLook');return;}if(s.waiting){s.waiting=false;s.open=[];}let first=s.open.length?s.open[0]:s.cards.findIndex(p=>!s.matched.has(p.id));let p=s.cards[first];if(!p)return;s.hints=s.cards.map((c,i)=>c.id===p.id?i:-1).filter(i=>i>=0);this.renderMemory();this.feedback('memoryHelp',false,true);}
      else if(this.type==='patterns'){if(s.activeHole<0){this.speak('patternLight');return;}s.hint=this.patternExpected().id;this.renderPatterns();this.feedback('patternHelp',false,true);this.demo(this.work.querySelector('[data-id="'+s.hint+'"]'),this.work.querySelector('[data-position="'+s.activeHole+'"]'));}
    }
    demo(source,target) {if(!source||!target||this.reducedMotion)return;this.fly(source,target,glyph('hand','#fff'));}
    handleClick(event) {
      if(performance.now()<this.suppressClickUntil||this.paused||this.disposed)return;const target=event.target.closest('[data-action]');if(!target||!this.wrapper.contains(target)||target.disabled)return;
      const a=target.dataset.action,s=this.state;
      switch(a){
        case 'close':return this.close();case 'repeat':return this.speak(this.instructionKey);case 'help':return this.help();case 'next':return this.next();case 'finish':return this.finish(this.creation);
        case 'select-sort':return this.selectSorting(target.dataset.id);case 'place-sort':return this.placeSorting();
        case 'add-cup':return this.addCup();case 'remove-cup':return this.removeCup();case 'serve-mode':return this.serveMode();case 'serve-person':return this.servePerson(Number(target.dataset.person));
        case 'hear-melody':return this.playSequence(s.target,true);case 'hear-composition':return this.playSequence(s.composition,false);case 'note':return this.pressNote(Number(target.dataset.note));case 'check-music':return this.checkMusic();
        case 'clear-note':this.stopPlayback();s.input=[];return this.renderMusic();case 'undo-note':this.stopPlayback();s.composition.pop();return this.renderMusic();case 'finish-music':return this.finish({type:'melody',notes:s.composition.length?s.composition.slice():[60,64,67],tempo:100});
        case 'select-seed':return this.selectSeed(target.dataset.id);case 'plant-seed':return this.plantSeed(target.dataset.id);case 'rotate-seed':if(s.selected&&!s.busy){s.rotations[s.selected]=(s.rotations[s.selected]+90)%360;this.sound(62);this.renderShapes();}return;case 'water-tool':s.watering=!s.watering;s.selected=null;this.renderShapes();return;
        case 'memory-start':s.preview=false;this.renderMemory();this.instruction(this.difficulty===3?'memoryShadow':'memory');return;case 'memory-card':return this.flipCard(Number(target.dataset.card));case 'memory-again':s.waiting=false;s.open=[];s.justFlipped=-1;this.renderMemory();return;
        case 'pattern-hole':s.activeHole=Number(target.dataset.position);return this.renderPatterns();case 'pattern-choice':return this.choosePattern(target.dataset.id);case 'light-pattern':return this.lightPattern();
      }
    }
    setPaused(value) {
      if(this.disposed||this.paused===!!value)return;this.paused=!!value;this.wrapper.inert=this.paused;this.wrapper.classList.toggle('mg-is-paused',this.paused);this.cancelDrag();
      if(this.paused){this.stopPlayback();this.animations.forEach(a=>a.pause());}else{this.lastFrame=0;this.animations.forEach(a=>a.play());if(this.type==='music')this.renderMusic();this.dirty=true;}
    }
    dispose() {
      if(this.disposed)return;this.stopPlayback();this.disposed=true;this.cancelDrag();cancelAnimationFrame(this.frame);this.tasks.clear();this.animations.forEach(a=>a.cancel());this.animations.clear();
      ['click','pointerdown','pointermove','pointerup','pointercancel','keydown'].forEach((event,i)=>this.wrapper.removeEventListener(event,[this.boundClick,this.boundDown,this.boundMove,this.boundUp,this.boundCancel,this.boundKey][i]));
      this.wrapper.remove();this.container.classList.remove('mg-mounted');if(active===this)active=null;if(this.previousFocus?.isConnected){try{this.previousFocus.focus({preventScroll:true});}catch(_){}}
    }
    close() {if(this.disposed)return;const callback=this.options.onClose;this.dispose();if(callback)callback();}
    finish(creation) {if(this.disposed||this.completed<3)return;let result={gameId:this.type,assisted:this.assisted,score:this.completed,difficulty:this.difficulty,mistakes:this.mistakes,skill:CATALOG.find(x=>x.id===this.type).skill};if(creation)result.creation=creation;let callback=this.options.onComplete;this.dispose();if(callback)callback(result);}
    snapshot() {return {type:this.type,difficulty:this.difficulty,phase:this.phase,round:this.round,completed:this.completed,paused:this.paused,clock:this.clock,playing:this.playing,activeTasks:this.tasks.size,activeAnimations:this.animations.size,transition:this.transition?this.transition.kind:null};}
    drawScene() {
      if(!this.canvas?.isConnected)return;
      const bounds=this.canvas.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
      const dpr=Math.min(2,global.devicePixelRatio||1),w=bounds.width,h=bounds.height;
      if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}
      const c=this.ctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
      const grad=c.createLinearGradient(0,0,w*.2,h);grad.addColorStop(0,'#272142');grad.addColorStop(.55,'#493b70');grad.addColorStop(1,this.type==='shapes'?'#49768a':'#8272a5');c.fillStyle=grad;c.fillRect(0,0,w,h);
      const t=this.reducedMotion?0:this.clock*.001;
      for(let i=0;i<22;i++){let x=((i*71+19)%337)/337*w,y=((i*41+33)%211)/450*h;let a=.3+.28*Math.sin(t*.7+i);c.globalAlpha=a;star(c,x,y,i%4===0?3:1.5,'#d8c6ff');}c.globalAlpha=1;
      // Slow, broad beams keep the performance setting alive without flashing.
      for(let i=0;i<2;i++){let x=w*(i?.83:.12),end=w*(.3+i*.4)+Math.sin(t*.35+i)*w*.08;c.beginPath();c.moveTo(x,-10);c.lineTo(end+w*.21,h*.85);c.lineTo(end-w*.21,h*.85);c.closePath();let beam=c.createLinearGradient(x,0,end,h*.85);beam.addColorStop(0,i?'#ffc88726':'#68e1ed29');beam.addColorStop(1,'#ffffff00');c.fillStyle=beam;c.fill();}
      const scale=Math.min(w/360,h/450),ox=(w-360*scale)/2,oy=(h-450*scale)/2;c.save();c.translate(ox,oy);c.scale(scale,scale);
      // Neon skyline and a physical platform recur in all six workshop scenes.
      for(let i=0;i<7;i++){let x=i*58-12,top=125+(i*29)%76;rr(c,x,top,45,110,4,'#241e4360');for(let j=0;j<4;j++)for(let k=0;k<2;k++)rr(c,x+9+k*17,top+12+j*18,6,8,1,(i+j+k)%3?'#98c6f43b':'#ffd17855');}
      ellipse(c,180,372,160,45,'#19193245');rr(c,25,346,310,32,15,'#443257');ellipse(c,180,347,155,33,'#ad91cd');ellipse(c,180,345,143,27,'#d5bfea');
      line(c,[[44,370],[316,370]],'#72eee2',3);line(c,[[64,378],[296,378]],'#ff8fc6',2);
      const tr=this.transition,progress=tr?Math.min(1,(this.clock-tr.start)/tr.duration):0;
      if(this.type==='sorting')this.drawOutfit(c,t,tr,progress);
      if(this.type==='counting')this.drawPicnic(c,t,tr,progress);
      if(this.type==='music')this.drawBand(c,t,tr,progress);
      if(this.type==='shapes')this.drawGarden(c,t,tr,progress);
      if(this.type==='memory')this.drawMemoryScene(c,t,tr,progress);
      if(this.type==='patterns')this.drawLanternScene(c,t,tr,progress);
      if(this.phase==='roundDone'||this.phase==='finished'){
        for(let i=0;i<7;i++){let a=(i/7)*Math.PI*2+t*.25;star(c,180+Math.cos(a)*132,215+Math.sin(a)*105,5+i%2,'#ffe296');}
      }
      c.restore();
    }
    drawPerformer(c,x,y,scale,action,t,role) {
      if(global.Art?.drawCharacter){global.Art.drawCharacter(c,{x,y,scale,role:role||['rumi','mira','zoey'][this.round],facing:'se',time:this.reducedMotion?0:this.clock,moving:false,walk:0,pregnant:false,holdingBaby:false,selected:false,mood:'happy',action:action||'idle',actionProgress:(t%2)/2,reducedMotion:this.reducedMotion});}
      else {ellipse(c,x,y-35*scale,20*scale,29*scale,'#f3ba9b');ellipse(c,x,y-65*scale,21*scale,23*scale,'#f3c5ad');rr(c,x-18*scale,y-44*scale,36*scale,42*scale,10*scale,'#b593ed');ellipse(c,x-7*scale,y-66*scale,2*scale,3*scale,'#493552');ellipse(c,x+7*scale,y-66*scale,2*scale,3*scale,'#493552');}
    }
    drawDoll(c,x,y,outfit,t,reaching) {
      c.save();c.translate(x,y);const wave=this.reducedMotion?0:Math.sin(t*3.8),skin='#f3c5ac';
      ellipse(c,0,9,57,14,'#4b386b24');
      // Exactly two legs and two arms; clothing alters surfaces, never adds limbs.
      line(c,[[-24,-19],[-30,8],[-44,11]],outfit.sock?.color||skin,16);line(c,[[24,-19],[31,8],[44,11]],outfit.sock?.color||skin,16);
      if(outfit.sock){paintSVG(c,motifArt(outfit.sock.pattern,'#fff7ec'),-41,-10,17,17);paintSVG(c,motifArt(outfit.sock.pattern,'#fff7ec'),24,-10,17,17);}
      line(c,[[-34,-78],[-59,-53+wave*2],[-58,-37+wave*3]],skin,14);line(c,[[34,-78],[58,-59-wave*3],[reaching?65:56,reaching?-79-wave*4:-39-wave*2]],skin,14);
      rr(c,-39,-90,78,80,24,outfit.suit?.color||'#eee5fc','#887099');
      if(outfit.suit)paintSVG(c,motifArt(outfit.suit.pattern,'#fff8f4'),-26,-74,52,52);
      ellipse(c,0,-99,12,12,skin);ellipse(c,-33,-139,7,10,skin);ellipse(c,33,-139,7,10,skin);ellipse(c,0,-143,35,39,skin);
      c.beginPath();c.moveTo(-35,-150);c.bezierCurveTo(-40,-188,27,-195,35,-153);c.bezierCurveTo(13,-156,1,-173,-9,-164);c.bezierCurveTo(-14,-155,-24,-151,-35,-150);c.fillStyle='#473044';c.fill();
      const blink=!this.reducedMotion&&(t%4.5>4.32);if(blink){line(c,[[-19,-143],[-10,-143]],'#443045',3);line(c,[[10,-143],[19,-143]],'#443045',3);}else{ellipse(c,-14,-144,3.6,4.8,'#443045');ellipse(c,14,-144,3.6,4.8,'#443045');ellipse(c,-13,-146,1,1.5,'#fff');ellipse(c,15,-146,1,1.5,'#fff');}
      ellipse(c,-23,-132,8,4,'#f0a7a2');ellipse(c,23,-132,8,4,'#f0a7a2');c.beginPath();c.arc(0,-135,10,.2,Math.PI-.2);c.strokeStyle='#a25761';c.lineWidth=3;c.stroke();
      if(outfit.hat){c.save();c.translate(0,-172);c.beginPath();c.moveTo(-36,0);c.bezierCurveTo(-34,-53,34,-53,36,0);c.closePath();c.fillStyle=outfit.hat.color;c.fill();rr(c,-40,-2,80,15,6,'#fff6e9');ellipse(c,0,-39,10,10,'#fff6e9');paintSVG(c,motifArt(outfit.hat.pattern,'#fff9ed'),-16,-31,32,32);c.restore();}
      if(outfit.bib){c.beginPath();c.moveTo(-28,-94);c.quadraticCurveTo(0,-71,28,-94);c.lineTo(30,-54);c.quadraticCurveTo(0,-33,-30,-54);c.closePath();c.fillStyle=outfit.bib.color;c.fill();paintSVG(c,motifArt(outfit.bib.pattern,'#fff7ef'),-18,-83,36,36);}
      c.restore();
    }
    drawOutfit(c,t,tr,p) {
      // Dressing-room mirror, bulb sockets, garment rail and the dressed baby.
      rr(c,84,70,192,251,83,'#8a70ad','#eac7f6');rr(c,95,80,170,228,76,'#c4bbe568');
      for(let i=0;i<10;i++){let a=Math.PI+i*Math.PI/9;ellipse(c,180+Math.cos(a)*103,167+Math.sin(a)*90,5,5,'#ffe5a4');}
      line(c,[[28,116],[28,296],[58,296]],'#deb6f0',5);line(c,[[26,119],[78,119]],'#deb6f0',5);
      paintSVG(c,icon('hanger','#dbb3ef'),33,118,44,44);paintSVG(c,icon('star','#f6d37f'),23,53,45,45);
      const outfit=this.state.outfit||{};this.drawDoll(c,180,332,outfit,t,tr?.kind==='dress');
      if(tr?.kind==='dress'){let q=ease(p),item=tr.item;let y=item.type==='hat'?120:item.type==='sock'?325:250;paintSVG(c,clothing(item),-10+q*144,170+q*(y-170)-Math.sin(p*Math.PI)*50,92,92,1-p*.2);}
      this.drawPerformer(c,302,340,.86,this.phase==='roundDone'||this.phase==='finished'?'celebrate':tr?'wave':'idle',t,'zoey');
    }
    drawPicnic(c,t,tr,p) {
      const s=this.state,n=s.people||4;
      // The hosts stand behind the counter; guest portraits are place cards,
      // so no detached bodies or free-floating "sipping arms" are drawn.
      this.drawPerformer(c,106,340,1.65,this.phase==='roundDone'||this.phase==='finished'?'celebrate':tr?.kind==='serve'?'wave':'idle',t,'mira');
      this.drawPerformer(c,253,340,1.55,this.phase==='roundDone'||this.phase==='finished'?'celebrate':'idle',t,'rumi');
      rr(c,22,272,316,86,24,'#dcadd2','#a477b1');rr(c,30,278,300,69,18,'#fff0dc');
      for(let i=0;i<n;i++){
        const x=48+(i%4)*72,y=284+Math.floor(i/4)*30;
        rr(c,x-7,y-2,62,27,6,'#f4e1e9');paintSVG(c,person(i+this.round),x-4,y,23,23);
        if(s.served?.has(i))paintSVG(c,icon('cup',COLORS[i%COLORS.length]),x+26,y,25,25);
        else{ellipse(c,x+38,y+17,10,4,'#d6bfd0');}
      }
      rr(c,76,372,208,22,10,'#5d416e','#eeb7dc');for(let i=0;i<(s.tray||0);i++)paintSVG(c,icon('cup',COLORS[i%COLORS.length]),84+i*23,356,28,28);
      if(tr?.kind==='serve'){
        const x=74+(tr.person%4)*72,y=284+Math.floor(tr.person/4)*30,q=ease(p);
        paintSVG(c,icon('cup',COLORS[tr.person%COLORS.length]),168+(x-168)*q,350+(y-350)*q-Math.sin(p*Math.PI)*60,30,30);
      }
      paintSVG(c,icon('flower','#ed8cb8'),157,230,46,46);
    }
    drawBand(c,t,tr,p) {
      const active=this.sounding&&(this.clock-this.sounding.at<560),midi=active?this.sounding.midi:60,index=NOTES.findIndex(n=>n.midi===midi);
      const dancing=active||this.playing||this.phase==='roundDone'||this.phase==='compose';
      for(let i=0;i<2;i++){let x=i?282:25;rr(c,x,226,53,100,10,'#302440','#d2a3ed');ellipse(c,x+26,255,16,16,'#5a467c');ellipse(c,x+26,296,19,19,'#1f1d32');ellipse(c,x+26,296,8+(active?Math.sin(t*30)*2:0),8,'#a897db');}
      this.drawPerformer(c,105,262,1.45,dancing?'music':'idle',t,'rumi');this.drawPerformer(c,252,264,1.32,dancing?'celebrate':'idle',t,'mira');
      rr(c,73,298,215,48,13,'#3b2e56','#dbb7ee');NOTES.forEach((note,i)=>{let hit=active&&i===index;rr(c,81+i*40,300+(hit?4:0),35,32,7,hit?'#fff4ce':note.color);paintSVG(c,icon(note.symbol,note.color),84+i*40,305,28,28);});
      // The instrument mallet visibly strikes the corresponding bar.
      const hitX=98+index*40,age=active?(this.clock-this.sounding.at)/560:1,hitY=active?290-Math.sin(Math.min(1,age)*Math.PI)*38:255;
      line(c,[[hitX,hitY],[hitX+1,hitY+28]],'#ffe8b6',5);ellipse(c,hitX+1,hitY+28,10,9,'#ffca77');
      if(active){for(let i=0;i<3;i++)paintSVG(c,icon('music',NOTES[index]?.color||'#ffe29b'),132+i*37,180-(this.clock-this.sounding.at)*.08-i*13,27,27,1-age*.6);}
      if(this.phase==='compose'){for(let i=0;i<(this.state.composition?.length||0);i++)star(c,87+i*27,386,5,noteByMidi(this.state.composition[i]).color);}
    }
    drawGarden(c,t,tr,p) {
      const s=this.state,beds=s.beds||[];line(c,[[21,335],[339,335]],'#65d9c4',3);
      const coords=beds.map((f,i)=>({x:52+i*(256/Math.max(1,beds.length-1)),y:320-(i%2)*28}));
      this.drawPerformer(c,188,340,1.45,tr?.kind==='water'?'wave':this.phase==='roundDone'?'celebrate':'idle',t,'zoey');
      beds.forEach((form,i)=>{let pt=coords[i],planted=s.planted?.has(form.id),grown=s.grown?.has(form.id),watering=tr?.kind==='water'&&tr.id===form.id,growth=grown?1:watering?Math.max(0,(p-.22)/.78):0;
        ellipse(c,pt.x,pt.y+9,25,11,'#31463e55');rr(c,pt.x-23,pt.y-7,46,31,8,'#aa7297','#ffd4e7');ellipse(c,pt.x,pt.y-7,24,9,'#6c4663');
        if(planted)paintSVG(c,formArt(form.id,form.color,false,s.bedRotations[form.id]),pt.x-13,pt.y-20,26,26);
        if(growth>0){let gh=68*growth;line(c,[[pt.x,pt.y-8],[pt.x+Math.sin(t*1.3+i)*2,pt.y-8-gh]],'#73d7af',5);ellipse(c,pt.x-10,pt.y-14-gh*.36,11*growth,5*growth,'#93dba4');ellipse(c,pt.x+11,pt.y-14-gh*.58,12*growth,6*growth,'#70c793');paintSVG(c,icon('flower',form.color),pt.x-26*growth,pt.y-35-gh,52*growth,52*growth);}
      });
      if(tr?.kind==='water'){let index=beds.findIndex(f=>f.id===tr.id),pt=coords[index];if(pt){c.save();c.translate(pt.x+33,pt.y-53);c.rotate(-.18);c.beginPath();c.moveTo(3,9);c.lineTo(-17,-5);c.lineTo(-22,1);c.lineTo(3,24);c.closePath();c.fillStyle='#70d3c1';c.fill();c.strokeStyle='#d2fff1';c.lineWidth=2;c.stroke();c.beginPath();c.arc(35,14,14,-Math.PI*.6,Math.PI*.6);c.strokeStyle='#83e0cd';c.lineWidth=5;c.stroke();rr(c,0,0,32,30,7,'#53b8aa','#d4fff1');ellipse(c,16,1,14,4,'#a5e9d5');c.restore();for(let i=0;i<9;i++){let drop=(p*3+i/9)%1,x=pt.x+10*(1-drop)+(i%3-1)*4,y=pt.y-49+drop*40;ellipse(c,x,y,2,4,'#a6e9ff');}}}
      if(tr?.kind==='plant'){let index=beds.findIndex(f=>f.id===tr.id),pt=coords[index],f=beds[index];if(pt)paintSVG(c,formArt(f.id,f.color,false,s.bedRotations[f.id]),160+(pt.x-160)*p,160+(pt.y-180)*p-Math.sin(p*Math.PI)*40,30,30);}
      paintSVG(c,icon('sun','#ffcf73'),33,48,56,56);
      if(this.phase==='roundDone'||this.phase==='finished'){let x=95+Math.sin(t*.5)*85,y=220+Math.cos(t*.7)*20;c.save();c.translate(x,y);ellipse(c,-5,-2,9,Math.max(1,Math.abs(Math.sin(t*7))*9),'#f9aece');ellipse(c,5,-2,9,Math.max(1,Math.abs(Math.sin(t*7))*9),'#d4b2ff');line(c,[[0,-7],[0,9]],'#64517d',3);c.restore();}
    }
    drawMemoryScene(c,t,tr,p) {
      const s=this.state,found=Array.from(s.matched||[]);rr(c,48,72,264,122,22,'#302743','#caa1ef');rr(c,59,83,242,100,15,'#48345f');
      for(let i=0;i<6;i++){let x=84+(i%3)*95,y=111+Math.floor(i/3)*45;let pic=PICTURES.find(q=>q.id===found[i]);if(pic){c.shadowColor=pic.color;c.shadowBlur=12;paintSVG(c,icon(pic.id,pic.color),x-18,y-18,36,36);c.shadowBlur=0;}else ellipse(c,x,y,13,13,'#63517d');}
      this.drawPerformer(c,117,331,1.7,found.length?'celebrate':'idle',t,'mira');this.drawPerformer(c,244,331,1.55,found.length?'wave':'idle',t,'zoey');
      rr(c,143,270,70,46,9,'#c7a9e7','#f1d1f7');paintSVG(c,icon('heart','#fb91be'),161,278,35,35);
      if(tr?.kind==='pair'){let q=ease(p);paintSVG(c,icon(tr.picture.id,tr.picture.color),150,260-q*150,55,55,1-p*.4);for(let i=0;i<4;i++)star(c,180+Math.cos(i*1.57+t)*60*p,270-120*p+Math.sin(i*1.57+t)*35*p,4,'#ffe2a0');}
      if(s.preview)paintSVG(c,glyph('eye','#ead4ff'),150,208,60,60);
    }
    drawLanternScene(c,t,tr,p) {
      const s=this.state,seq=s.sequence||[];const n=seq.length,lit=s.lit||this.phase==='finished';
      // Two curved wires accommodate the longest ABAC rule without tiny objects.
      for(let row=0;row<2;row++){c.beginPath();c.moveTo(18,70+row*95);c.quadraticCurveTo(180,134+row*95,342,70+row*95);c.strokeStyle='#d6b3e4';c.lineWidth=3;c.stroke();}
      seq.forEach((picture,i)=>{let row=Math.floor(i/7),col=i%7,x=31+col*49,y=83+row*95+Math.sin(col/6*Math.PI)*23;
        line(c,[[x,y-8],[x,y+4]],'#e7bfec',2);let isLit=lit&&(tr?.kind!=='light'||i/n<p);if(picture){if(isLit){c.shadowBlur=20;c.shadowColor=picture.color;}ellipse(c,x,y+22,19,23,isLit?picture.color:'#87769d');c.shadowBlur=0;paintSVG(c,icon(picture.id,isLit?'#fff3d5':picture.color),x-15,y+7,30,30);line(c,[[x,y+45],[x,y+53]],'#dbafd5',3);}else{ellipse(c,x,y+20,14,18,'#3a2c5555');}});
      this.drawPerformer(c,113,339,1.45,lit?'music':'idle',t,'rumi');this.drawPerformer(c,253,339,1.35,lit?'celebrate':'idle',t,'zoey');
      if(tr?.kind==='lantern'){let i=tr.position,row=Math.floor(i/7),col=i%7,x=31+col*49,y=102+row*95+Math.sin(col/6*Math.PI)*23;paintSVG(c,icon(tr.picture.id,tr.picture.color),163+(x-178)*p,330+(y-330)*p-Math.sin(p*Math.PI)*30,34,34);}
      if(lit)for(let i=0;i<5;i++)star(c,75+i*53,385+Math.sin(t*2+i)*3,5,PICTURES[i].color);
    }
  }

  function creationArt(creation) {
    const item = creation && typeof creation === 'object' ? creation : {};
    const put = (source,x,y,size) => '<g transform="translate('+x+' '+y+') scale('+(size/80)+')">'+source.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')+'</g>';
    let scene='<rect x="0" y="0" width="360" height="220" rx="26" fill="#34284f"/><path d="M25 180q155-45 310 0" fill="none" stroke="#b992db" stroke-width="5"/>';
    if(item.type==='outfit') (item.items||[]).slice(0,4).forEach((g,i)=>{const safe={type:['hat','bib','sock','suit'].includes(g.type)?g.type:'suit',color:/^#[0-9a-f]{6}$/i.test(g.color)?g.color:'#b3a1dc',pattern:MOTIFS.includes(g.pattern)?g.pattern:'star'};scene+=put(clothing(safe),24+i*80,65,78);});
    else if(item.type==='garden') (item.flowers||[]).slice(0,5).forEach((id,i)=>{let f=FORMS.find(x=>x.id===id)||FORMS[0],x=30+i*64;scene+='<path d="M'+(x+25)+' 180v-65" stroke="#79d5b2" stroke-width="5" stroke-linecap="round"/>'+put(icon('flower',f.color),x,62,52)+put(formArt(f.id,f.color),x+7,155,38);});
    else if(item.type==='pattern') (item.symbols||[]).slice(0,14).forEach((id,i)=>{let p=PICTURES.find(x=>x.id===id)||PICTURES[0];scene+=put(icon(p.id,p.color),19+(i%7)*47,45+Math.floor(i/7)*75,42);});
    else if(item.type==='melody') (item.notes||[]).slice(0,8).forEach((midi,i)=>{let n=noteByMidi(midi);scene+=put(icon(n.symbol,n.color),36+(i%4)*75,37+Math.floor(i/4)*80,58);});
    else if(item.type==='memory') (item.pictures||[]).slice(0,6).forEach((id,i)=>{let p=PICTURES.find(x=>x.id===id)||PICTURES[0];scene+=put(icon(p.id,p.color),56+(i%3)*92,35+Math.floor(i/3)*85,61);});
    else if(item.type==='picnic') for(let i=0;i<Math.min(8,Math.max(1,Number(item.guests)||1));i++)scene+=put(icon('cup',COLORS[i]),35+(i%4)*75,45+Math.floor(i/4)*75,55);
    else scene+=put(icon('star','#f9cf72'),125,50,110);
    return svg(scene,'0 0 360 220');
  }

  global.Minigames={
    catalog:Object.freeze(CATALOG.map(x=>Object.freeze(x))),
    creationArt,
    voiceLines:Object.freeze(Array.from(new Set(Object.values(V).concat(NUMBERS.slice(1))))),
    open:function(type,options){if(!CATALOG.some(x=>x.id===type))throw new Error('Unbekanntes Minispiel: '+escapeText(type));if(!options?.container?.replaceChildren)throw new Error('Minigames.open braucht einen gültigen Container.');if(active)active.dispose();const session=new Session(type,options);active=session;return {close:()=>session.close(),destroy:()=>session.dispose(),setPaused:value=>session.setPaused(value),snapshot:()=>session.snapshot()};}
  };
})(window);
