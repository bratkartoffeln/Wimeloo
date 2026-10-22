'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../www/state.js'), 'utf8');
const KEY = 'sternenbaby.state.v1', BACKUP = 'sternenbaby.state.backup.v1';
function boot(seed = {}, options = {}) {
  const records = new Map(Object.entries(seed));
  const storage = {getItem: key => records.get(key) || null, setItem(key, value) { if (options.failKey === key) throw new Error('quota'); records.set(key, value); }, removeItem: key => records.delete(key)};
  const context = {Date, Math, JSON, Number, Array, Set, Object, SyntaxError, TextEncoder, localStorage: storage};
  context.globalThis = context;
  vm.runInNewContext(code, context);
  return {api: context.GameState, records, options};
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }
const legacy = {version: 1, started: true, mother: 'mira', selected: 'zoey', babyName: 'Luna', story: 3, chapter: 7,
  visited: ['park', 'concert', 'assisted:6'], memories: ['welcome', 'feed', 'music', 'grow2'], outfit: 2, wall: 3, melody: [69, 67, 64, 62, 60],
  care: {feed: 18, fresh: 9, play: 16, sleep: 10}, games: {sorting: 4, counting: 8, music: 7}, babyStage: 2, lastCare: 'sleep',
  settings: {sound: false, music: true, difficulty: 3, sessionMinutes: 20, reduceMotion: true},
  positions: {rumi: {x: 7.5, y: 8}, mira: {x: 5, y: 6}, zoey: {x: 8, y: 5}}, createdAt: 1700000000000};
let checks = 0;
function test(name, callback) { callback(); checks++; console.log('PASS', name); }

test('0.1.0 migration preserves all existing play progress and identity', () => {
  const {api, records} = boot({[KEY]: JSON.stringify(legacy)});
  for (const key of ['started','mother','selected','babyName','story','chapter','visited','memories','outfit','wall','melody','care','babyStage','lastCare','positions','createdAt']) assert.deepEqual(plain(api.data[key]), legacy[key], key);
  assert.equal(api.data.version, 2);
  for (const id of ['sorting','counting','music']) assert.equal(api.data.games[id], legacy.games[id]);
  for (const id of ['shapes','memory','patterns']) assert.equal(api.data.games[id], 0);
  assert.equal(api.data.settings.sound, false);
  assert.equal(api.data.settings.difficulty, 3);
  assert.equal(api.data.settings.musicVolume, .75);
  assert.equal(api.data.settings.effectsVolume, .65);
  assert.equal(api.data.settings.voiceVolume, 1);
  assert.equal(api.save(), true);
  assert.equal(JSON.parse(records.get(KEY)).version, 2);
  assert.deepEqual(JSON.parse(records.get(BACKUP)), legacy);
});

test('damaged primary loads previous backup and never overwrites it with damage', () => {
  const {api, records} = boot({[KEY]: '{broken', [BACKUP]: JSON.stringify(legacy)});
  assert.equal(api.data.babyName, 'Luna');
  assert.equal(api.storageWarning, true);
  api.save();
  assert.equal(JSON.parse(records.get(BACKUP)).care.feed, 18);
});

test('unrelated or future primary falls back to a valid older backup', () => {
  for (const input of [{version: 1}, {...legacy, version: 100}]) {
    const {api} = boot({[KEY]: JSON.stringify(input), [BACKUP]: JSON.stringify(legacy)});
    assert.equal(api.data.babyName, 'Luna');
    assert.equal(api.storageWarning, true);
  }
});

test('invalid numbers, unknown decorations, prototypes and invalid daily dates are constrained', () => {
  const {api} = boot();
  const cleaned = api.clean({...legacy, chapter: 999, games: {sorting: -20, counting: Infinity, music: '70'}, settings: {musicVolume: 99, effectsVolume: -1, voiceVolume: '1'}, decorations: ['lanterns','lanterns','__proto__','unknown'], dailyPlan: {date: '2026-02-30', tasks: ['care:feed'], completed: ['care:feed']}, positions: {mira:{x:Infinity,y:0}}});
  assert.equal(cleaned.chapter, 11);
  assert.deepEqual(plain(cleaned.decorations), ['lanterns']);
  assert.equal(cleaned.games.counting, 0);
  assert.equal(cleaned.games.music, 0);
  assert.equal(cleaned.settings.musicVolume, 1);
  assert.equal(cleaned.settings.effectsVolume, 0);
  assert.equal(cleaned.settings.voiceVolume, 1);
  assert.equal(cleaned.dailyPlan.date, '');
});

test('one completion increases six-game counters once and records assisted play equally', () => {
  const {api} = boot();
  for (const id of api.gameIds) {
    assert.equal(api.recordGame(id, {assisted: true}, 3), true);
    assert.equal(api.data.games[id], 1);
    assert.deepEqual(plain(api.data.mastery[id]), {completed: 1, assisted: 1, bestDifficulty: 3, lastDifficulty: 3});
    api.recordGame(id, {assisted: false}, 1);
    assert.equal(api.data.games[id], 2);
    assert.equal(api.data.mastery[id].bestDifficulty, 3);
  }
  assert.equal(api.recordGame('__proto__', {}, 2), false);
});

test('daily ideas are deterministic, distinct and pregnancy safe', () => {
  const first = boot().api, second = boot().api;
  const date = '2026-10-21';
  const a = plain(first.ensureDailyPlan(date)), b = plain(second.ensureDailyPlan(date));
  assert.deepEqual(a, b);
  assert.equal(a.tasks.length, 3);
  assert.equal(new Set(a.tasks).size, 3);
  assert.equal(a.tasks.some(task => task.startsWith('care:')), false);
  assert.equal(first.data.visitHistory.length, 0, 'visiting alone does not award a completed-day star');
  first.data.story = 3;
  assert.equal(first.ensureDailyPlan('2026-10-22').tasks.filter(task => task.startsWith('care:')).length, 1);
});

test('only three completed daily ideas record one day-star; game counters do not complete it implicitly', () => {
  const {api} = boot();
  api.data.story = 3;
  const plan = api.ensureDailyPlan();
  const gameTask = plan.tasks.find(task => task.startsWith('game:'));
  api.recordGame(gameTask.slice(5), {}, 1);
  assert.equal(plan.completed.length, 0);
  assert.equal(api.data.visitHistory.length, 0);
  for (const task of plan.tasks) api.completeDailyTask(task);
  assert.deepEqual(plain(api.data.visitHistory), [plan.date]);
  api.completeDailyTask(plan.tasks[0]);
  assert.equal(api.data.visitHistory.length, 1);
});

test('daily completion is idempotent and long absences change no care or achievements', () => {
  const {api} = boot({[KEY]: JSON.stringify(legacy)});
  const before = plain({care:api.data.care,games:api.data.games,memories:api.data.memories,chapter:api.data.chapter,babyStage:api.data.babyStage});
  const plan = api.ensureDailyPlan();
  assert.equal(api.completeDailyTask(plan.tasks[0]), true);
  assert.equal(api.completeDailyTask(plan.tasks[0]), false);
  assert.equal(api.completeDailyTask('unrelated'), false);
  api.ensureDailyPlan('2027-12-31');
  assert.deepEqual(plain({care:api.data.care,games:api.data.games,memories:api.data.memories,chapter:api.data.chapter,babyStage:api.data.babyStage}), before);
});

test('portable export/import roundtrip preserves progress with current-state backup', () => {
  const source = boot({[KEY]:JSON.stringify(legacy)}).api;
  source.data.chapter = 11;
  source.data.decorations = ['rainbow', 'starMobile'];
  source.recordGame('memory', {assisted:false}, 2);
  const text = source.exportSave();
  const target = boot();
  assert.equal(target.api.inspectImport(text).ok, true);
  assert.equal(target.api.data.started, false, 'preview must not replace current state');
  assert.equal(target.api.importSave(text).ok, true);
  assert.equal(target.api.data.chapter, 11);
  assert.equal(target.api.data.games.memory, 1);
  assert.equal(target.api.data.babyName, 'Luna');
  assert.equal(JSON.parse(target.records.get(BACKUP)).started, false);
  assert.deepEqual(plain(target.api.data), plain(source.clean(source.data)));
});

test('identical autosaves after an import preserve the prior progress backup', () => {
  const source = boot({[KEY]: JSON.stringify(legacy)}).api;
  const target = boot();
  target.api.data.babyName = 'Milo';
  target.api.save();
  assert.equal(target.api.importSave(source.exportSave()).ok, true);
  const backup = target.records.get(BACKUP);
  target.api.save(); target.api.save(); target.api.save();
  assert.equal(target.records.get(BACKUP), backup);
  assert.equal(JSON.parse(backup).babyName, 'Milo');
});

test('raw legacy imports accepted; unrelated, malicious, large or future formats rejected without changes', () => {
  const {api, records} = boot({[KEY]:JSON.stringify(legacy)});
  assert.equal(api.inspectImport(JSON.stringify(legacy)).ok, true);
  assert.equal(api.inspectImport('\ufeff' + JSON.stringify(legacy)).ok, true);
  const old = records.get(KEY);
  for (const text of ['{}','[]','{bad',JSON.stringify({...legacy,version:99}),JSON.stringify({format:'other',formatVersion:1,state:legacy}),JSON.stringify({format:'sternenbaby-save',formatVersion:2,state:legacy}),'x'.repeat(1024*1024+1)]) {
    assert.equal(api.importSave(text).ok, false);
    assert.equal(records.get(KEY), old);
    assert.equal(api.data.babyName, 'Luna');
  }
});

test('failed import write retains the live and stored existing save', () => {
  const fixture = boot({[KEY]:JSON.stringify(legacy)});
  const candidate = boot().api.exportSave();
  fixture.options.failKey = KEY;
  assert.equal(fixture.api.importSave(candidate).ok, false);
  assert.equal(fixture.api.data.babyName, 'Luna');
  assert.deepEqual(JSON.parse(fixture.records.get(KEY)), legacy);
  assert.equal(JSON.parse(fixture.records.get(BACKUP)).babyName, 'Luna');
});
console.log(JSON.stringify({suite:'state-v1-release',passed:checks}));
