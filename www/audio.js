/* Sternenbaby 1.0: local, three-channel sound. No samples or network required. */
(function (global) {
  'use strict';
  let context = null, compressor = null, musicBus = null, effectBus = null;
  let speechActive = false, timers = [], melodyToken = 0;
  const voices = new Set();
  const clamp = (n, fallback) => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
  const settings = () => global.GameState?.data?.settings || {};

  function ensure() {
    if (!context) {
      const Constructor = global.AudioContext || global.webkitAudioContext;
      if (!Constructor) return null;
      context = new Constructor();
      compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -8;
      compressor.knee.value = 12;
      compressor.ratio.value = 5;
      compressor.attack.value = .003;
      compressor.release.value = .18;
      musicBus = context.createGain();
      effectBus = context.createGain();
      musicBus.connect(compressor);
      effectBus.connect(compressor);
      compressor.connect(context.destination);
    }
    if (context.state === 'suspended' && !document.hidden) context.resume().catch(() => {});
    update();
    return context;
  }

  function update() {
    if (!context) return;
    const s = settings(), enabled = s.sound !== false;
    const music = enabled ? clamp(s.musicVolume, .75) * (speechActive ? .28 : 1) : 0;
    const effects = enabled ? clamp(s.effectsVolume, .65) : 0;
    musicBus.gain.setTargetAtTime(music, context.currentTime, .04);
    effectBus.gain.setTargetAtTime(effects, context.currentTime, .025);
  }

  // A rounded bell with two quiet overtones stays audible on small tablet speakers.
  // At the default setting the fundamental peaks at .36 instead of the old .12.
  function synth(ctx, destination, midi, time, length, strength = 1, kind = 'music') {
    const frequency = 440 * Math.pow(2, (midi - 69) / 12);
    const parts = kind === 'bass' ? [[1, .18, 'triangle']] :
      kind === 'effects' ? [[1, .24, 'sine'], [2, .045, 'sine']] :
      [[1, .48, 'sine'], [2, .105, 'sine'], [3, .035, 'sine']];
    const created = [];
    for (const [multiple, amplitude, type] of parts) {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency * multiple;
      const peak = amplitude * strength;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(peak, time + .014);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0001, peak * .42), time + Math.min(.16, length * .35));
      gain.gain.exponentialRampToValueAtTime(.0001, time + length);
      osc.connect(gain); gain.connect(destination);
      osc.start(time); osc.stop(time + length + .03);
      osc.onended = () => { voices.delete(osc); osc.disconnect(); gain.disconnect(); };
      created.push(osc);
    }
    return created;
  }

  function note(midi = 60, length = .45, channel = 'effects', strength = 1) {
    if (settings().sound === false || document.hidden) return;
    if (!Number.isFinite(midi) || midi < 36 || midi > 96) return;
    try {
      const ctx = ensure(); if (!ctx) return;
      for (const osc of synth(ctx, channel === 'effects' ? effectBus : musicBus,
        midi, ctx.currentTime + .008, Math.max(.12, Math.min(3, length)), strength, channel)) voices.add(osc);
    } catch (_) { /* Silent devices keep the game playable. */ }
  }

  function stopMelody() {
    melodyToken++;
    timers.forEach(clearTimeout); timers = [];
  }

  function playMelody(notes, options = {}) {
    stopMelody();
    const token = melodyToken;
    const list = (notes || []).filter(n => [60, 62, 64, 67, 69].includes(n)).slice(0, 16);
    if (!list.length || settings().sound === false) return 0;
    ensure();
    const beat = Math.max(260, Math.min(700, options.beat || 420));
    const loops = Math.max(1, Math.min(4, options.loops || 2));
    for (let i = 0; i < list.length * loops; i++) {
      timers.push(setTimeout(() => {
        if (token !== melodyToken || document.hidden) return;
        note(list[i % list.length], .75, 'music');
        if (options.withBass !== false && i % 2 === 0) note(list[i % list.length] - 12, .95, 'bass', .7);
        options.onNote?.(i % list.length);
      }, i * beat));
    }
    const duration = list.length * loops * beat;
    timers.push(setTimeout(() => { if (token === melodyToken) { timers = []; options.onEnd?.(); } }, duration));
    return duration;
  }

  function stopAll() {
    stopMelody();
    for (const osc of voices) { try { osc.stop(); } catch (_) {} }
    voices.clear();
  }
  function duck(active) { speechActive = !!active; update(); }
  function suspend() { stopAll(); if (context?.state === 'running') context.suspend().catch(() => {}); }

  global.GameAudio = {
    note, playMelody, stopMelody, stopAll, update, duck, suspend, unlock: ensure,
    get playing() { return timers.length > 0; },
    get contextState() { return context?.state || 'uninitialized'; },
    // The production synthesizer is reused by the offline loudness regression check.
    renderTone: synth
  };
})(window);
