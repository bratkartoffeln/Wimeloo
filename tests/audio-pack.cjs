#!/usr/bin/env node
'use strict';

// Portable offline voice-pack validation. All MP3 files below www/ belong to
// this pack. No browser, network access, or third-party Node package is needed.
// Usage: node tests/audio-pack.cjs [--require-ffprobe | --skip-ffprobe]
// Optional: FFPROBE_EXECUTABLE=/path/to/ffprobe

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const EXPECTED_LINE_COUNT = 144;
const DEFAULT_PROJECT_ROOT = path.resolve(__dirname, '..');

// Deliberately identical to normalized() in www/app.js, including order.
function normalizeText(text) {
  return String(text).normalize('NFC').replace(/\s+/g, ' ').trim();
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function safeRelativeMp3(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return 'Dateipfad muss eine nicht leere Zeichenkette sein';
  }
  if (value !== value.trim() || /[\u0000-\u001f\u007f]/u.test(value)) {
    return 'Leerzeichen am Rand oder Steuerzeichen im Dateipfad';
  }
  if (value.includes(':') || value.startsWith('/') || value.includes('\\')) {
    return 'nur lokale relative Pfade mit Vorwärtsschrägstrichen sind erlaubt';
  }
  if (/[?#%]/u.test(value)) {
    return 'URL-Parameter, Fragmente und Prozentkodierung sind nicht erlaubt';
  }
  // A single leading ./ is harmless; all other dot segments are rejected.
  const clean = value.startsWith('./') ? value.slice(2) : value;
  if (clean.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
    return 'leere oder übergeordnete Pfadsegmente sind nicht erlaubt';
  }
  if (!/\.mp3$/i.test(clean)) return 'Dateiendung muss .mp3 sein';
  return null;
}

function clipLabel(text) {
  return JSON.stringify(text.length > 110 ? `${text.slice(0, 107)}…` : text);
}

function readIndex(sourceFile) {
  const source = fs.readFileSync(sourceFile, 'utf8');
  const sandbox = { window: Object.create(null) };
  const context = vm.createContext(sandbox, {
    name: 'offline-voice-pack-index',
    codeGeneration: { strings: false, wasm: false }
  });
  new vm.Script(source, { filename: sourceFile }).runInContext(context, { timeout: 1000 });
  const packDescriptor = Object.getOwnPropertyDescriptor(sandbox.window, 'VoicePack');
  if (!packDescriptor || !Object.hasOwn(packDescriptor, 'value')) {
    throw new Error('voices.js muss window.VoicePack als Datenobjekt setzen');
  }
  const pack = packDescriptor.value;
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    throw new Error('window.VoicePack muss ein Objekt mit Text→Datei-Zuordnungen sein');
  }
  const prototype = Object.getPrototypeOf(pack);
  const plainPrototype = vm.runInContext('Object.prototype', context, { timeout: 1000 });
  if (prototype !== null && prototype !== plainPrototype) {
    throw new Error('window.VoicePack darf keinen eigenen Prototyp haben');
  }
  if (Object.getOwnPropertySymbols(pack).length) {
    throw new Error('window.VoicePack darf keine Symbolschlüssel enthalten');
  }
  return Object.entries(Object.getOwnPropertyDescriptors(pack)).map(([text, descriptor]) => {
    if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) {
      throw new Error(`Ungültiger Indexeintrag: ${clipLabel(text)}`);
    }
    return [text, descriptor.value];
  });
}

function collectMp3Files(wwwRoot, errors) {
  const files = [];
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && /\.mp3$/i.test(entry.name)) files.push(absolute);
      else if (entry.isSymbolicLink()) {
        // Android assets must be actual packaged files. Reject links rather
        // than silently omit a linked directory or follow it outside www/.
        errors.push(`Symbolischer Link unter www/ ist nicht zulässig: ${path.relative(wwwRoot, absolute)}`);
      }
    }
  };
  walk(wwwRoot);
  return files.sort();
}

function validateAudioPack(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || DEFAULT_PROJECT_ROOT);
  const wwwRoot = path.join(projectRoot, 'www');
  const errors = [];
  const warnings = [];
  const result = {
    expected: EXPECTED_LINE_COUNT,
    sourceLines: 0,
    indexEntries: 0,
    mp3Files: 0,
    checkedFiles: 0,
    totalBytes: 0,
    ffprobe: 'not-run',
    probedFiles: 0,
    totalDuration: 0,
    errors,
    warnings
  };

  let lines;
  let entries;
  let wwwReal;
  try {
    lines = JSON.parse(fs.readFileSync(path.join(projectRoot, 'tests', 'voice-lines.json'), 'utf8'));
    if (!Array.isArray(lines)) throw new Error('voice-lines.json muss ein JSON-Array sein');
    entries = readIndex(path.join(wwwRoot, 'voices.js'));
    wwwReal = fs.realpathSync(wwwRoot);
  } catch (error) {
    errors.push(`Eingabedateien konnten nicht gelesen werden: ${error.message}`);
    return result;
  }

  result.sourceLines = lines.length;
  result.indexEntries = entries.length;
  if (lines.length !== EXPECTED_LINE_COUNT) {
    errors.push(`voice-lines.json enthält ${lines.length} Texte; erwartet sind ${EXPECTED_LINE_COUNT}`);
  }
  if (entries.length !== EXPECTED_LINE_COUNT) {
    errors.push(`VoicePack enthält ${entries.length} Zuordnungen; erwartet sind ${EXPECTED_LINE_COUNT}`);
  }

  const expected = new Map();
  lines.forEach((text, index) => {
    if (typeof text !== 'string' || !normalizeText(text)) {
      errors.push(`Ungültiger oder leerer Text in voice-lines.json an Position ${index + 1}`);
      return;
    }
    const normalized = normalizeText(text);
    if (expected.has(normalized)) {
      errors.push(`Doppelter Quelltext nach NFC/Whitespace-Normalisierung an Position ${expected.get(normalized) + 1} und ${index + 1}: ${clipLabel(normalized)}`);
    } else expected.set(normalized, index);
  });

  const indexed = new Map();
  const assignedPaths = new Map();
  const assignedRealPaths = new Map();
  const probeFiles = [];
  for (const [text, file] of entries) {
    const normalized = normalizeText(text);
    if (!normalized) errors.push('VoicePack enthält einen leeren Textschlüssel');
    if (text !== normalized) {
      errors.push(`Indexschlüssel ist nicht exakt NFC/Whitespace-normalisiert: ${clipLabel(text)}`);
    }
    if (indexed.has(normalized)) {
      errors.push(`Mehrere Indexschlüssel ergeben denselben normalisierten Text: ${clipLabel(normalized)}`);
    } else indexed.set(normalized, file);
    if (!expected.has(normalized)) errors.push(`Überschüssiger Text im Index: ${clipLabel(normalized)}`);

    const pathError = safeRelativeMp3(file);
    if (pathError) {
      errors.push(`Unsicherer oder ungültiger Pfad für ${clipLabel(text)}: ${pathError} (${JSON.stringify(file)})`);
      continue;
    }
    const absolute = path.resolve(wwwRoot, file);
    if (!inside(wwwRoot, absolute)) {
      errors.push(`Dateipfad verlässt www/: ${file}`);
      continue;
    }
    if (assignedPaths.has(absolute)) {
      errors.push(`Datei mehrfach zugeordnet: ${file}; ${clipLabel(assignedPaths.get(absolute))} und ${clipLabel(text)}`);
    } else assignedPaths.set(absolute, text);
    try {
      const real = fs.realpathSync(absolute);
      if (!inside(wwwReal, real)) {
        errors.push(`Realer Dateipfad verlässt www/: ${file}`);
        continue;
      }
      const stat = fs.statSync(absolute);
      if (!stat.isFile()) {
        errors.push(`Audio-Pfad ist keine reguläre Datei: ${file}`);
        continue;
      }
      if (stat.size === 0) {
        errors.push(`Leere Audiodatei: ${file}`);
        continue;
      }
      if (assignedRealPaths.has(real)) {
        if (assignedRealPaths.get(real).absolute !== absolute) {
          errors.push(`Dieselbe reale Datei wird unter mehreren Pfaden zugeordnet: ${assignedRealPaths.get(real).file} und ${file}`);
        }
        continue;
      }
      assignedRealPaths.set(real, { absolute, file });
      probeFiles.push({ absolute, file });
      result.checkedFiles++;
      result.totalBytes += stat.size;
    } catch (error) {
      errors.push(`Audiodatei fehlt oder ist nicht lesbar: ${file} (${error.code || error.message})`);
    }
  }

  for (const text of expected.keys()) {
    if (!indexed.has(text)) errors.push(`Fehlender Text im Index: ${clipLabel(text)}`);
  }
  try {
    const files = collectMp3Files(wwwRoot, errors);
    result.mp3Files = files.length;
    for (const absolute of files) {
      if (!assignedPaths.has(absolute)) {
        errors.push(`Überschüssige, nicht zugeordnete MP3-Datei: ${path.relative(wwwRoot, absolute)}`);
      }
    }
  } catch (error) {
    errors.push(`MP3-Dateiinventar konnte nicht gelesen werden: ${error.message}`);
  }

  if (options.skipFfprobe) {
    result.ffprobe = 'skipped';
    warnings.push('MP3-Stream und Dauer wurden mit --skip-ffprobe ausdrücklich nicht geprüft.');
    return result;
  }
  const executable = options.ffprobeExecutable || process.env.FFPROBE_EXECUTABLE || 'ffprobe';
  const available = spawnSync(executable, ['-version'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  if (available.error || available.status !== 0) {
    result.ffprobe = 'unavailable';
    const detail = available.error?.message || `Exit ${available.status}`;
    const message = `ffprobe ist nicht ausführbar (${detail}); MP3-Stream und Dauer wurden nicht geprüft`;
    if (options.requireFfprobe || options.ffprobeExecutable || process.env.FFPROBE_EXECUTABLE || available.error?.code !== 'ENOENT') {
      errors.push(message);
    } else warnings.push(`${message}. --require-ffprobe macht diese Prüfung verpflichtend.`);
    return result;
  }
  result.ffprobe = 'checked';
  for (const { absolute, file } of probeFiles) {
    const probe = spawnSync(executable, [
      '-v', 'error', '-show_entries',
      'format=format_name,duration:stream=index,codec_type,codec_name,duration',
      '-of', 'json', absolute
    ], { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024, windowsHide: true });
    if (probe.error || probe.status !== 0) {
      errors.push(`ffprobe fehlgeschlagen für ${file}: ${probe.error?.message || probe.stderr.trim() || `Exit ${probe.status}`}`);
      continue;
    }
    try {
      const metadata = JSON.parse(probe.stdout);
      const streams = Array.isArray(metadata.streams) ? metadata.streams : [];
      const audio = streams.filter(stream => stream.codec_type === 'audio');
      if (audio.length !== 1 || audio[0].codec_name !== 'mp3') {
        errors.push(`Kein einzelner gültiger MP3-Audiostream: ${file}`);
        continue;
      }
      if (!(metadata.format?.format_name || '').split(',').includes('mp3')) {
        errors.push(`Audiodatei hat keinen MP3-Container: ${file}`);
        continue;
      }
      const duration = Number(metadata.format?.duration || audio[0].duration);
      if (!Number.isFinite(duration) || duration <= 0) {
        errors.push(`Audiodatei hat keine positive Dauer: ${file}`);
        continue;
      }
      // ffprobe may print a decode/demux error even when returning exit 0.
      if (probe.stderr.trim()) {
        errors.push(`ffprobe meldet einen Fehler für ${file}: ${probe.stderr.trim()}`);
        continue;
      }
      result.probedFiles++;
      result.totalDuration += duration;
    } catch (error) {
      errors.push(`Ungültige ffprobe-Metadaten für ${file}: ${error.message}`);
    }
  }
  return result;
}

function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--help') || args.has('-h')) {
    console.log('Aufruf: node tests/audio-pack.cjs [--require-ffprobe | --skip-ffprobe]\n' +
      'Prüft 149 Texte, normalisierte Indexschlüssel, eindeutige sichere lokale MP3-Pfade,\n' +
      'vollständiges MP3-Inventar unter www/ sowie vorhandene Dateien mit Inhalt.\n' +
      'ffprobe auf PATH prüft automatisch MP3-Stream und positive Dauer aller Clips.\n' +
      'FFPROBE_EXECUTABLE kann einen anderen lokalen ffprobe-Pfad setzen.\n' +
      '--require-ffprobe: fehlendes ffprobe ist ein Fehler.\n' +
      '--skip-ffprobe: nur Text-, Pfad- und Dateiprüfung.\n' +
      'Projektpfade werden aus __dirname aufgelöst; kein bestimmtes Arbeitsverzeichnis nötig.');
    return;
  }
  if ([...args].some(arg => !['--require-ffprobe', '--skip-ffprobe'].includes(arg)) ||
      (args.has('--require-ffprobe') && args.has('--skip-ffprobe'))) {
    console.error('Ungültige Optionen. Hilfe: node tests/audio-pack.cjs --help');
    process.exitCode = 2;
    return;
  }
  const result = validateAudioPack({
    requireFfprobe: args.has('--require-ffprobe'),
    skipFfprobe: args.has('--skip-ffprobe')
  });
  console.log(`Audiopaket: ${result.sourceLines}/${result.expected} Quelltexte, ${result.indexEntries} Indexeinträge, ${result.mp3Files} MP3-Dateien.`);
  console.log(`Dateiprüfung: ${result.checkedFiles} eindeutige Dateien mit Inhalt, ${(result.totalBytes / 1024 / 1024).toFixed(2)} MiB.`);
  if (result.ffprobe === 'checked') {
    console.log(`ffprobe: ${result.probedFiles}/${result.checkedFiles} gültige MP3-Clips, Gesamtdauer ${result.totalDuration.toFixed(2)} s.`);
  }
  for (const warning of result.warnings) console.warn(`HINWEIS: ${warning}`);
  if (result.errors.length) {
    console.error(`NICHT BESTANDEN: ${result.errors.length} Fehler.`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(result.ffprobe === 'checked' ? 'BESTANDEN: Dateizuordnung und MP3-Prüfung vollständig.' :
      'BESTANDEN: Text-, Pfad- und Dateiprüfung; MP3-Stream und Dauer nicht geprüft.');
  }
}

module.exports = { normalizeText, safeRelativeMp3, validateAudioPack };
if (require.main === module) main();
