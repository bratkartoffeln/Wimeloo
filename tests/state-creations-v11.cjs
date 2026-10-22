'use strict';
/* Persistence contract for all six kinds of children's creations, including old saves. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'www/state.js'),'utf8');
const KEY='sternenbaby.state.v1',BACKUP='sternenbaby.state.backup.v1';
const clone=value=>JSON.parse(JSON.stringify(value));
function boot(seed={},options={}){
  const records=new Map(Object.entries(seed));
  const localStorage={getItem:key=>records.get(key)||null,setItem(key,value){if(options.failKey===key)throw new Error('quota');records.set(key,value);},removeItem:key=>records.delete(key)};
  const context={Date,Math,JSON,Number,Array,Set,Object,SyntaxError,TextEncoder,localStorage};context.globalThis=context;
  vm.runInNewContext(source,context);
  return{api:context.GameState,records,options};
}
const legacy={version:1,started:true,mother:'mira',selected:'zoey',babyName:'Luna',story:3,chapter:7,visited:['park','concert'],memories:['welcome','feed','music','grow2'],outfit:2,wall:3,melody:[69,67,64,62,60],care:{feed:18,fresh:9,play:16,sleep:10},games:{sorting:4,counting:8,music:7},babyStage:2,lastCare:'sleep',settings:{sound:false,music:true,difficulty:3,sessionMinutes:20,reduceMotion:true},positions:{rumi:{x:7.5,y:8},mira:{x:5,y:6},zoey:{x:8,y:5}},createdAt:1700000000000};
const creations={
  sorting:{type:'outfit',items:[{type:'suit',color:'#a89bdc',pattern:'star'},{type:'hat',color:'#80b9b0',pattern:'stripe'},{type:'bib',color:'#e8bb69',pattern:'dots'},{type:'sock',color:'#cb98b5',pattern:'star'}]},
  counting:{type:'picnic',guests:5},
  music:{type:'melody',notes:[60,62,64,67,69,67,64],tempo:100},
  shapes:{type:'garden',flowers:['circle','triangle','square','rectangle','hexagon']},
  memory:{type:'memory',pictures:['sun','cloud','flower','star','moon','heart']},
  patterns:{type:'pattern',symbols:['sun','moon','moon','sun','moon','moon','sun','moon','moon']}
};
const results=[];
function test(name,fn){const data=fn()||{};results.push({name,...data});console.log('PASS',name,JSON.stringify(data));}

test('schema-1-and-existing-schema-2-saves-retain-progress-and-start-with-empty-gallery',()=>{
  for(const version of [1,2]){
    const input={...clone(legacy),version},session=boot({[KEY]:JSON.stringify(input)}),s=session.api.data;
    assert.equal(s.version,2);assert.deepEqual(clone(s.creations),{});
    for(const key of ['mother','selected','babyName','story','chapter','visited','memories','outfit','wall','melody','care','babyStage','lastCare','positions','createdAt'])assert.deepEqual(clone(s[key]),input[key],key);
    for(const id of Object.keys(input.games))assert.equal(s.games[id],input.games[id]);
    assert.equal(s.settings.sound,false);assert.equal(s.settings.difficulty,3);
    assert.equal(session.api.save(),true);assert.deepEqual(JSON.parse(session.records.get(BACKUP)),input);
  }
  return{schemas:[1,2],currentSchema:2};
});

test('six-creation-types-survive-save-and-fresh-runtime-reload',()=>{
  const session=boot({[KEY]:JSON.stringify(legacy)}),before=clone({games:session.api.data.games,care:session.api.data.care,memories:session.api.data.memories});
  assert.deepEqual([...session.api.gameIds].sort(),Object.keys(creations).sort());
  for(const[id,creation]of Object.entries(creations))assert.equal(session.api.recordCreation(id,clone(creation)),true,id);
  assert.deepEqual(clone(session.api.data.creations),creations);
  assert.deepEqual(JSON.parse(session.records.get(KEY)).creations,creations);
  const reopened=boot(Object.fromEntries(session.records));
  assert.deepEqual(clone(reopened.api.data.creations),creations);
  assert.deepEqual(clone({games:reopened.api.data.games,care:reopened.api.data.care,memories:reopened.api.data.memories}),before,'Saving a creation must not double-count game progress');
  return{types:Object.values(creations).map(c=>c.type)};
});

test('stored-creations-own-their-data-and-new-work-replaces-only-that-game',()=>{
  const{api}=boot();const input=clone(creations);
  for(const[id,value]of Object.entries(input))api.recordCreation(id,value);
  input.sorting.items[0].color='#000000';input.shapes.flowers.push('bad');input.patterns.symbols[0]='bad';input.music.notes.push(999);input.memory.pictures.length=0;input.counting.guests=900;
  assert.deepEqual(clone(api.data.creations),creations);
  const replacement={type:'garden',flowers:['hexagon','circle']};api.recordCreation('shapes',replacement);
  assert.deepEqual(clone(api.data.creations),{...creations,shapes:replacement});
  assert.equal(api.recordCreation('shapes',{type:'garden',flowers:['unknown']}),false);
  assert.deepEqual(clone(api.data.creations.shapes),replacement);
});

test('export-preview-import-reload-roundtrip-preserves-all-works-and-prior-save-backup',()=>{
  const origin=boot({[KEY]:JSON.stringify(legacy)});
  for(const[id,value]of Object.entries(creations))origin.api.recordCreation(id,value);
  origin.api.data.melody=[...creations.music.notes];origin.api.save();
  const exported=origin.api.exportSave(),envelope=JSON.parse(exported);
  assert.equal(envelope.format,'sternenbaby-save');assert.equal(envelope.formatVersion,1);assert.equal(envelope.state.version,2);assert.equal(envelope.appVersion,'1.1.0');
  const target=boot();target.api.data.babyName='Milo';target.api.recordCreation('shapes',{type:'garden',flowers:['triangle']});
  const prior=target.records.get(KEY),review=target.api.inspectImport(exported);
  assert.equal(review.ok,true);assert.equal(target.records.get(KEY),prior);assert.equal(target.api.data.babyName,'Milo');
  assert.equal(target.api.importSave(exported).ok,true);assert.deepEqual(clone(target.api.data.creations),creations);
  assert.equal(JSON.parse(target.records.get(BACKUP)).babyName,'Milo');
  assert.deepEqual(JSON.parse(target.records.get(BACKUP)).creations,{shapes:{type:'garden',flowers:['triangle']}});
  const reopened=boot(Object.fromEntries(target.records)),backup=reopened.records.get(BACKUP);
  assert.deepEqual(clone(reopened.api.data.creations),creations);assert.deepEqual(clone(reopened.api.data.melody),creations.music.notes);
  reopened.api.save();reopened.api.save();assert.equal(reopened.records.get(BACKUP),backup);
});

test('creation-sizes-and-numeric-values-are-bounded-before-storage',()=>{
  const{api}=boot();
  api.recordCreation('sorting',{type:'outfit',items:Array.from({length:70},()=>({...creations.sorting.items[0],extra:'discard'}))});
  api.recordCreation('shapes',{type:'garden',flowers:Array(20).fill(creations.shapes.flowers).flat().concat(['unknown'])});
  api.recordCreation('patterns',{type:'pattern',symbols:Array(100).fill('moon')});
  api.recordCreation('memory',{type:'memory',pictures:['sun','cloud','flower','star','moon','heart','music','cup','basket','hanger','baby','shirt','ball','leaf','butterfly','sun','unknown']});
  api.recordCreation('counting',{type:'picnic',guests:99999});
  api.recordCreation('music',{type:'melody',notes:Array(100).fill(60),tempo:99999});
  assert.equal(api.data.creations.sorting.items.length,4);assert.deepEqual(Object.keys(api.data.creations.sorting.items[0]),['type','color','pattern']);
  assert.equal(api.data.creations.shapes.flowers.length,5);assert.equal(new Set(api.data.creations.shapes.flowers).size,5);
  assert.equal(api.data.creations.patterns.symbols.length,16);assert.equal(api.data.creations.memory.pictures.length,8);
  assert.equal(api.data.creations.counting.guests,8);assert.equal(api.data.creations.music.notes.length,16);assert.equal(api.data.creations.music.tempo,160);
  api.recordCreation('counting',{type:'picnic',guests:-70});assert.equal(api.data.creations.counting.guests,2);
  api.recordCreation('counting',{type:'picnic',guests:'6'});assert.equal(api.data.creations.counting.guests,2);
  api.recordCreation('music',{type:'melody',notes:[60,NaN,Infinity,'62',62,12],tempo:NaN});
  assert.deepEqual(clone(api.data.creations.music),{type:'melody',notes:[60,62],tempo:100});
  return{outfitItems:4,gardenForms:5,patternSymbols:16,memoryPictures:8,guests:[2,8],melodyNotes:16,maxTempo:160};
});

test('wrong-types-empty-payloads-and-unsafe-values-do-not-replace-valid-work',()=>{
  const{api}=boot();
  for(const[id,value]of Object.entries(creations))api.recordCreation(id,value);
  const invalid={
    sorting:[{type:'garden',items:creations.sorting.items},{type:'outfit',items:[]},{type:'outfit',items:[{type:'suit',color:'#fff',pattern:'star'}]},{type:'outfit',items:[{type:'suit',color:'url(javascript:bad)',pattern:'star'}]},{type:'outfit',items:[{type:'script',color:'#123456',pattern:'star'}]},{type:'outfit',items:[{type:'suit',color:'#123456',pattern:'<script>'}]}],
    counting:[{type:'outfit'},{type:'<script>'}],
    music:[{type:'melody',notes:[]},{type:'melody',notes:[null,999,'60']},{type:'melody',notes:'60,62'}],
    shapes:[{type:'garden',flowers:['<script>','unknown']},{type:'garden',flowers:'circle'},{type:'picnic',flowers:['circle']}],
    memory:[{type:'memory',pictures:[]},{type:'memory',pictures:['unknown',2]}],
    patterns:[{type:'pattern',symbols:[2,null,'<script>']},{type:'pattern',symbols:{0:'star'}}]
  };
  for(const id of Object.keys(creations))for(const value of [null,[],12,'bad',{},...invalid[id]])assert.equal(api.recordCreation(id,value),false,id+' '+JSON.stringify(value));
  for(const id of ['__proto__','constructor','unknown'])assert.equal(api.recordCreation(id,creations.music),false);
  assert.deepEqual(clone(api.data.creations),creations);
});

test('untrusted-import-filters-unknown-keys-html-and-cross-game-payloads',()=>{
  const{api}=boot();
  const input=JSON.parse(JSON.stringify({...legacy,version:2,creations:{
    sorting:{type:'outfit',items:[{type:'hat',color:'#AABBCC',pattern:'star',onclick:'alert(1)'},{type:'bib',color:'" onload="bad',pattern:'dots'}]},
    counting:{type:'picnic',guests:3.9,html:'<img onerror="bad">'},
    music:{type:'melody',notes:[60,'<script>',67],tempo:100,src:'javascript:bad'},
    shapes:{type:'garden',flowers:['circle','circle','<script>','hexagon']},
    memory:{type:'memory',pictures:['sun','<svg onload=bad>','moon','sun']},
    patterns:{type:'pattern',symbols:['heart','<iframe>','heart','music']},
    unknown:{type:'melody',notes:[60]}
  }}));
  Object.defineProperty(input.creations,'__proto__',{value:{polluted:true},enumerable:true});
  const review=api.inspectImport(JSON.stringify(input));assert.equal(review.ok,true);
  assert.deepEqual(clone(review.state.creations),{
    sorting:{type:'outfit',items:[{type:'hat',color:'#AABBCC',pattern:'star'}]},counting:{type:'picnic',guests:3},music:{type:'melody',notes:[60,67],tempo:100},shapes:{type:'garden',flowers:['circle','hexagon']},memory:{type:'memory',pictures:['sun','moon']},patterns:{type:'pattern',symbols:['heart','heart','music']}
  });
  assert.equal(Object.prototype.polluted,undefined);assert.equal(JSON.stringify(review.state.creations).includes('<'),false);
  assert.equal(api.data.started,false,'Import preview mutated live state');
});

test('oversized-future-and-failed-imports-preserve-current-creations',()=>{
  const session=boot({[KEY]:JSON.stringify(legacy)});session.api.recordCreation('music',creations.music);
  const current=session.records.get(KEY),currentWorks=clone(session.api.data.creations);
  const huge={...legacy,creations:{patterns:{type:'pattern',symbols:Array(180000).fill('butterfly')}}};
  assert(JSON.stringify(huge).length>1024*1024);
  for(const input of [JSON.stringify(huge),JSON.stringify({...legacy,version:99,creations}),JSON.stringify({format:'sternenbaby-save',formatVersion:2,state:{...legacy,creations}})]){
    assert.equal(session.api.importSave(input).ok,false);assert.equal(session.records.get(KEY),current);assert.deepEqual(clone(session.api.data.creations),currentWorks);
  }
  const incoming=boot();incoming.api.recordCreation('shapes',creations.shapes);session.options.failKey=KEY;
  assert.equal(session.api.importSave(incoming.api.exportSave()).ok,false);assert.equal(session.records.get(KEY),current);assert.deepEqual(clone(session.api.data.creations),currentWorks);
  assert.deepEqual(JSON.parse(session.records.get(BACKUP)).creations,currentWorks);
});

const report={suite:'state-creations-v11',schema:2,passed:results.length,results};
fs.mkdirSync(path.join(root,'verification'),{recursive:true});fs.writeFileSync(path.join(root,'verification/state-creations-v11.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({suite:report.suite,passed:report.passed}));
