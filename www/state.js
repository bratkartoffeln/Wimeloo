/* Sternenbaby — local state and lossless v1 → v2 migration.
 * Time away never changes baby care, chapters or earned memories.
 */
(function (global) {
  'use strict';
  const VERSION = 2;
  // Keep the original storage origin and keys so APK updates retain progress.
  const KEY = 'sternenbaby.state.v1';
  const BACKUP = 'sternenbaby.state.backup.v1';
  const MAX_SAVE_BYTES = 1024 * 1024;
  const ROLES = ['rumi', 'mira', 'zoey'];
  const NAMES = ['Sternchen', 'Luna', 'Milo', 'Nala', 'Lio', 'Maja'];
  const GAMES = ['sorting', 'counting', 'music', 'shapes', 'memory', 'patterns'];
  const CARE = ['feed', 'fresh', 'play', 'sleep'];
  const CREATIVE = ['park', 'decorate', 'concert', 'album'];
  const DECORATIONS = ['bunting', 'lanterns', 'rainbow', 'cushions', 'starMobile', 'flowerArch'];
  const TASKS = CARE.map(id => 'care:' + id).concat(GAMES.map(id => 'game:' + id), CREATIVE.map(id => 'visit:' + id));
  const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const bounded = (value, max, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : fallback;
  const unique = (value, allowed, max) => Array.isArray(value) ? [...new Set(value.filter(item => typeof item === 'string' && (allowed ? allowed.includes(item) : item.length > 0 && item.length < 90)))].slice(0, max) : [];
  function localDate(date = new Date()) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parts = value.split('-').map(Number), date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return date.getUTCFullYear() === parts[0] && date.getUTCMonth() === parts[1] - 1 && date.getUTCDate() === parts[2];
  }
  const fresh = () => ({
    version: VERSION, started: false, mother: 'rumi', selected: 'rumi', babyName: 'Sternchen',
    story: 0, chapter: 0, visited: [], memories: [], outfit: 0, wall: 0,
    melody: [60, 64, 67, 64], care: {feed: 0, fresh: 0, play: 0, sleep: 0},
    games: Object.fromEntries(GAMES.map(id => [id, 0])),
    mastery: Object.fromEntries(GAMES.map(id => [id, {completed: 0, assisted: 0, bestDifficulty: 0, lastDifficulty: 1}])),
    dailyPlan: {date: '', tasks: [], completed: []}, visitHistory: [], decorations: [], creations: {},
    babyStage: 0, lastCare: 'none', chapterReady: false,
    settings: {sound: true, music: true, musicVolume: .75, effectsVolume: .65, voiceVolume: 1, difficulty: 1, sessionMinutes: 15, reduceMotion: false},
    positions: {rumi: {x: 8, y: 7}, mira: {x: 9, y: 5}, zoey: {x: 5, y: 8}}, createdAt: Date.now()
  });
  function clean(input) {
    const s = fresh();
    if (!isObject(input)) return s;
    s.started = input.started === true;
    s.mother = ROLES.includes(input.mother) ? input.mother : s.mother;
    s.selected = ROLES.includes(input.selected) ? input.selected : s.selected;
    s.babyName = NAMES.includes(input.babyName) ? input.babyName : s.babyName;
    s.story = bounded(input.story, 3);
    s.chapter = bounded(input.chapter, 11);
    s.babyStage = bounded(input.babyStage, 2);
    s.lastCare = CARE.includes(input.lastCare) ? input.lastCare : 'none';
    s.chapterReady = input.chapterReady === true;
    for (const key of ['visited', 'memories']) s[key] = unique(input[key], null, 300);
    s.outfit = bounded(input.outfit, 3);
    s.wall = bounded(input.wall, 3);
    if (Array.isArray(input.melody)) s.melody = input.melody.filter(note => [60, 62, 64, 67, 69].includes(note)).slice(0, 16);
    if (!s.melody.length) s.melody = [60, 64, 67, 64];
    for (const category of ['care', 'games']) for (const id of Object.keys(s[category])) s[category][id] = bounded(input[category]?.[id], 100000);
    for (const id of GAMES) {
      const progress = isObject(input.mastery?.[id]) ? input.mastery[id] : {};
      // Old saves already contain completed counts. Do not lose those on migration.
      s.mastery[id].completed = s.games[id];
      s.mastery[id].assisted = Math.min(s.games[id], bounded(progress.assisted, 100000));
      s.mastery[id].bestDifficulty = bounded(progress.bestDifficulty, 3);
      s.mastery[id].lastDifficulty = [1, 2, 3].includes(progress.lastDifficulty) ? progress.lastDifficulty : 1;
    }
    if (isObject(input.settings)) {
      for (const key of ['sound', 'music', 'reduceMotion']) if (typeof input.settings[key] === 'boolean') s.settings[key] = input.settings[key];
      for (const key of ['musicVolume', 'effectsVolume', 'voiceVolume']) {
        if (typeof input.settings[key] === 'number' && Number.isFinite(input.settings[key])) s.settings[key] = Math.min(1, Math.max(0, input.settings[key]));
      }
      s.settings.difficulty = [1, 2, 3].includes(input.settings.difficulty) ? input.settings.difficulty : 1;
      s.settings.sessionMinutes = [0, 5, 10, 15, 20, 30].includes(input.settings.sessionMinutes) ? input.settings.sessionMinutes : 15;
    }
    for (const role of ROLES) {
      const p = input.positions?.[role];
      if (isObject(p) && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 17 && p.y >= 0 && p.y <= 15) s.positions[role] = {x: p.x, y: p.y};
    }
    s.createdAt = Number.isFinite(input.createdAt) && input.createdAt > 0 ? input.createdAt : s.createdAt;
    s.decorations = unique(input.decorations, DECORATIONS, DECORATIONS.length);
    if(isObject(input.creations))for(const id of GAMES){const creation=cleanCreation(id,input.creations[id]);if(creation)s.creations[id]=creation;}
    if (isObject(input.dailyPlan) && validDate(input.dailyPlan.date)) {
      s.dailyPlan.date = input.dailyPlan.date;
      s.dailyPlan.tasks = unique(input.dailyPlan.tasks, TASKS, 3);
      s.dailyPlan.completed = unique(input.dailyPlan.completed, s.dailyPlan.tasks, 3);
    }
    s.visitHistory = Array.isArray(input.visitHistory) ? [...new Set(input.visitHistory.filter(validDate))].slice(-366) : [];
    return s;
  }
  function isState(value) {
    return isObject(value) && [1, VERSION].includes(value.version) && typeof value.started === 'boolean' &&
      typeof value.story === 'number' && Number.isFinite(value.story) && isObject(value.care) && isObject(value.games);
  }
  let storageWarning = false;
  function load() {
    for (const key of [KEY, BACKUP]) {
      try {
        const raw = global.localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw);
        if (isState(data)) return clean(data);
        storageWarning = true;
      } catch (error) { storageWarning = true; }
    }
    return fresh();
  }
  let state = load();
  function save() {
    try {
      const serialized = JSON.stringify(clean(state));
      const previous = global.localStorage.getItem(KEY);
      if (previous === serialized) return true;
      if (previous) {
        try { if (isState(JSON.parse(previous))) global.localStorage.setItem(BACKUP, previous); }
        catch (error) { /* Preserve the last valid backup if the primary was damaged. */ }
      }
      global.localStorage.setItem(KEY, serialized);
      return true;
    } catch (error) { storageWarning = true; return false; }
  }
  function memory(id) {
    if (typeof id !== 'string' || !id || id.length >= 90) return false;
    if (!state.memories.includes(id)) { state.memories.push(id); save(); return true; }
    return false;
  }
  function visit(id) {
    if (typeof id !== 'string' || !id || id.length >= 90) return;
    if (!state.visited.includes(id)) state.visited.push(id);
    save();
  }
  function birth() { state.story = 3; state.chapter = 0; memory('welcome'); save(); }
  function reset() {
    state = fresh();
    try { global.localStorage.removeItem(KEY); global.localStorage.removeItem(BACKUP); } catch (error) { storageWarning = true; }
    save();
    return state;
  }
  function ensureDailyPlan(date = localDate()) {
    if (!validDate(date)) date = localDate();
    let changed = false;
    if (state.dailyPlan.date !== date || state.dailyPlan.tasks.length !== 3) {
      // A calendar seed makes each day's suggestions stable. No attendance reward or expiry penalty.
      const parts = date.split('-').map(Number), day = Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
      const index = length => ((day % length) + length) % length;
      const game = index(GAMES.length);
      state.dailyPlan = {date, tasks: [state.story >= 3 ? 'care:' + CARE[index(CARE.length)] : 'game:' + GAMES[(game + 1) % GAMES.length], 'game:' + GAMES[game], 'visit:' + CREATIVE[index(CREATIVE.length)]], completed: []};
      changed = true;
    }
    if (changed) save();
    return state.dailyPlan;
  }
  function completeDailyTask(id) {
    const plan = ensureDailyPlan();
    if (!plan.tasks.includes(id) || plan.completed.includes(id)) return false;
    plan.completed.push(id);
    if (plan.completed.length === 3 && !state.visitHistory.includes(plan.date)) {
      state.visitHistory.push(plan.date);
      state.visitHistory = state.visitHistory.slice(-366);
    }
    save();
    return true;
  }
  function recordGame(id, result = {}, difficulty = 1) {
    if (!GAMES.includes(id)) return false;
    difficulty = [1, 2, 3].includes(difficulty) ? difficulty : 1;
    // This is the sole increment. Callers must not additionally increment games[id].
    state.games[id] = Math.min(100000, state.games[id] + 1);
    const progress = state.mastery[id];
    progress.completed = state.games[id];
    progress.assisted = Math.min(progress.completed, progress.assisted + (result.assisted === true ? 1 : 0));
    progress.bestDifficulty = Math.max(progress.bestDifficulty, difficulty);
    progress.lastDifficulty = difficulty;
    save();
    return true;
  }
  function cleanCreation(id, value) {
    if(!GAMES.includes(id)||!isObject(value))return null;
    const symbols=['sun','cloud','flower','star','moon','heart','music','cup','basket','hanger','baby','shirt','ball','leaf','butterfly'];
    if(id==='sorting'&&value.type==='outfit'&&Array.isArray(value.items)){
      const items=value.items.filter(x=>isObject(x)&&['suit','bib','hat','sock'].includes(x.type)&&typeof x.color==='string'&&/^#[0-9a-fA-F]{6}$/.test(x.color)&&['star','dots','stripe'].includes(x.pattern)).slice(0,4).map(x=>({type:x.type,color:x.color,pattern:x.pattern}));
      return items.length?{type:'outfit',items}:null;
    }
    if(id==='shapes'&&value.type==='garden'){
      const flowers=unique(value.flowers,['circle','triangle','square','rectangle','hexagon'],5);return flowers.length?{type:'garden',flowers}:null;
    }
    if(id==='patterns'&&value.type==='pattern'&&Array.isArray(value.symbols)){
      const list=value.symbols.filter(x=>symbols.includes(x)).slice(0,16);return list.length?{type:'pattern',symbols:list}:null;
    }
    if(id==='memory'&&value.type==='memory'){
      const pictures=unique(value.pictures,symbols,8);return pictures.length?{type:'memory',pictures}:null;
    }
    if(id==='counting'&&value.type==='picnic')return{type:'picnic',guests:Math.max(2,bounded(value.guests,8,2))};
    if(id==='music'&&value.type==='melody'&&Array.isArray(value.notes)){
      const notes=value.notes.filter(n=>[60,62,64,67,69].includes(n)).slice(0,16);return notes.length?{type:'melody',notes,tempo:bounded(value.tempo,160,100)}:null;
    }
    return null;
  }
  function recordCreation(id, value) {
    const creation=cleanCreation(id,value);if(!creation)return false;state.creations[id]=creation;save();return true;
  }
  function exportSave() {
    return JSON.stringify({format: 'sternenbaby-save', formatVersion: 1, appVersion: '1.1.0', exportedAt: new Date().toISOString(), state: clean(state)}, null, 2);
  }
  function inspectImport(text) {
    try {
      if (typeof text !== 'string' || text.length === 0 || text.length > MAX_SAVE_BYTES) throw new Error('Die Datei ist leer oder zu groß.');
      if (typeof global.TextEncoder === 'function' && new global.TextEncoder().encode(text).length > MAX_SAVE_BYTES) throw new Error('Die Datei ist zu groß.');
      const parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
      let candidate = parsed;
      if (isObject(parsed) && Object.prototype.hasOwnProperty.call(parsed, 'format')) {
        if (parsed.format !== 'sternenbaby-save' || parsed.formatVersion !== 1) throw new Error('Dieses Sicherungsformat wird nicht unterstützt.');
        candidate = parsed.state;
      }
      if (isObject(candidate) && Number.isInteger(candidate.version) && candidate.version > VERSION) throw new Error('Diese Sicherung stammt aus einer neueren Spielversion.');
      if (!isState(candidate)) throw new Error('Diese Datei enthält keinen gültigen Sternenbaby-Spielstand.');
      return {ok: true, state: clean(candidate)};
    } catch (error) {
      return {ok: false, error: error instanceof SyntaxError ? 'Die Sicherungsdatei ist beschädigt oder kein JSON-Spielstand.' : error.message || 'Die Sicherung konnte nicht gelesen werden.'};
    }
  }
  function importSave(text) {
    const inspected = inspectImport(text);
    if (!inspected.ok) return inspected;
    try {
      // First preserve current progress; replace in-memory state only after the new save is durable.
      global.localStorage.setItem(BACKUP, JSON.stringify(clean(state)));
      global.localStorage.setItem(KEY, JSON.stringify(inspected.state));
      state = inspected.state;
      return {ok: true};
    } catch (error) { storageWarning = true; return {ok: false, error: 'Der Spielstand konnte nicht gespeichert werden. Dein bisheriger Fortschritt bleibt erhalten.'}; }
  }
  const api = {get data() { return state; }, get storageWarning() { return storageWarning; }, save, clean, fresh, reset, memory, visit, birth,
    recordGame, recordCreation, ensureDailyPlan, completeDailyTask, exportSave, inspectImport, importSave, localDate,
    roles: ROLES, names: NAMES, gameIds: GAMES, decorationIds: DECORATIONS, key: KEY, backupKey: BACKUP, version: VERSION};
  global.GameState = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
