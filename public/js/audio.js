// Synthesised music and sound effects (Web Audio API, no audio files).
import { prefs } from './prefs.js';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Progressions (MIDI roots) – bright, optimistic pop in A major / F# minor.
const RUN_PROG = [
  { root: 57, chord: [57, 61, 64] }, // A
  { root: 52, chord: [56, 59, 64] }, // E
  { root: 54, chord: [57, 61, 66] }, // F#m
  { root: 50, chord: [57, 62, 66] }, // D
];
const MENU_PROG = [
  { root: 50, chord: [62, 66, 69] }, // D
  { root: 57, chord: [61, 64, 69] }, // A
  { root: 59, chord: [62, 66, 71] }, // Bm
  { root: 55, chord: [59, 62, 67] }, // G
];
const HOOK = [76, null, 73, 76, null, 78, 76, null, 73, null, 71, 73, null, null, 69, null];
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicOn = prefs.get('music', true);
    this.sfxOn = prefs.get('sfx', true);
    this.mode = null;
    this.intensity = 0;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.combo = 0;
    this.comboT = 0;
  }

  /** Must be called from a user gesture. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicOn ? 0.42 : 0;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxOn ? 0.8 : 0;
      this.sfxGain.connect(this.master);
      // shared noise buffer
      const len = this.ctx.sampleRate * 1;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMusic(on) {
    this.musicOn = on;
    prefs.set('music', on);
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(on ? 0.42 : 0, this.ctx.currentTime, 0.1);
  }

  setSfx(on) {
    this.sfxOn = on;
    prefs.set('sfx', on);
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05);
  }

  // ------------------------------------------------------------------------
  // Primitive voices
  // ------------------------------------------------------------------------
  tone({ freq, type = 'sine', t = 0, dur = 0.2, vol = 0.3, attack = 0.005, slide = null, dest = null, filter = null, detune = 0 }) {
    const c = this.ctx;
    if (!c) return;
    const t0 = (t || c.currentTime) + 0.001;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (detune) o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = o;
    if (filter) {
      const f = c.createBiquadFilter();
      f.type = filter.type || 'lowpass';
      f.frequency.setValueAtTime(filter.freq, t0);
      if (filter.to) f.frequency.exponentialRampToValueAtTime(filter.to, t0 + dur);
      f.Q.value = filter.q || 0.8;
      o.connect(f);
      node = f;
    }
    node.connect(g).connect(dest || this.sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  noiseBurst({ t = 0, dur = 0.15, vol = 0.3, type = 'lowpass', freq = 1000, to = null, q = 0.7, dest = null }) {
    const c = this.ctx;
    if (!c) return;
    const t0 = (t || c.currentTime) + 0.001;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(dest || this.sfxGain);
    s.start(t0, Math.random() * 0.5);
    s.stop(t0 + dur + 0.05);
  }

  // ------------------------------------------------------------------------
  // Sound effects
  // ------------------------------------------------------------------------
  sfx(name, opt = {}) {
    if (!this.ctx || !this.sfxOn) return;
    const now = this.ctx.currentTime;
    switch (name) {
      case 'jump':
        this.tone({ freq: 320, slide: 720, type: 'square', dur: 0.14, vol: 0.09, filter: { freq: 2400 } });
        this.tone({ freq: 640, slide: 1200, dur: 0.12, vol: 0.06 });
        break;
      case 'doubleJump':
        this.tone({ freq: 520, slide: 1250, type: 'square', dur: 0.12, vol: 0.08, filter: { freq: 3000 } });
        this.tone({ freq: 780, slide: 1560, dur: 0.16, vol: 0.07, t: now + 0.05 });
        this.noiseBurst({ dur: 0.18, vol: 0.06, type: 'bandpass', freq: 3000, to: 6000 });
        break;
      case 'land':
        this.noiseBurst({ dur: 0.07, vol: 0.12 * (opt.k || 1), freq: 400 });
        this.tone({ freq: 110, slide: 60, dur: 0.09, vol: 0.12 * (opt.k || 1) });
        break;
      case 'slide':
        this.noiseBurst({ dur: 0.32, vol: 0.12, type: 'bandpass', freq: 1600, to: 380, q: 1.2 });
        break;
      case 'dive':
        this.tone({ freq: 900, slide: 260, dur: 0.15, vol: 0.06, type: 'triangle' });
        break;
      case 'bolt': {
        if (now - this.comboT > 0.6) this.combo = 0;
        this.comboT = now;
        const n = PENTA[Math.min(PENTA.length - 1, this.combo++ % PENTA.length)];
        const f = NOTE(76 + n);
        this.tone({ freq: f, dur: 0.18, vol: 0.09 });
        this.tone({ freq: f * 2, dur: 0.1, vol: 0.03, type: 'triangle' });
        break;
      }
      case 'part':
        [76, 81, 85, 88].forEach((n, i) => this.tone({ freq: NOTE(n), t: now + i * 0.06, dur: 0.3, vol: 0.09, type: 'triangle' }));
        this.tone({ freq: NOTE(100), t: now + 0.24, dur: 0.4, vol: 0.03 });
        break;
      case 'token':
        this.tone({ freq: 988, dur: 0.09, vol: 0.08, type: 'square', filter: { freq: 4000 } });
        this.tone({ freq: 1319, t: now + 0.08, dur: 0.35, vol: 0.08, type: 'square', filter: { freq: 4000 } });
        break;
      case 'power':
        [64, 68, 71, 76, 80].forEach((n, i) => this.tone({ freq: NOTE(n), t: now + i * 0.045, dur: 0.18, vol: 0.07, type: 'sawtooth', filter: { freq: 2600 } }));
        break;
      case 'helmet':
        this.noiseBurst({ dur: 0.25, vol: 0.2, type: 'bandpass', freq: 2600, q: 6 });
        this.tone({ freq: 190, dur: 0.3, vol: 0.12, type: 'square', filter: { freq: 1200 } });
        this.tone({ freq: 1250, dur: 0.4, vol: 0.05, type: 'triangle' });
        break;
      case 'crash':
        this.noiseBurst({ dur: 0.45, vol: 0.32, freq: 1800, to: 120 });
        this.tone({ freq: 140, slide: 40, dur: 0.5, vol: 0.25 });
        this.tone({ freq: 520, slide: 180, dur: 0.6, vol: 0.06, type: 'square', filter: { freq: 1500 } });
        break;
      case 'fall':
        this.tone({ freq: 900, slide: 140, dur: 0.75, vol: 0.09, type: 'triangle' });
        this.noiseBurst({ t: now + 0.55, dur: 0.3, vol: 0.2, freq: 300 });
        break;
      case 'smash':
        this.noiseBurst({ dur: 0.22, vol: 0.25, freq: 900, to: 200 });
        this.tone({ freq: 90, slide: 45, dur: 0.2, vol: 0.18 });
        break;
      case 'gate':
        this.tone({ freq: 55, slide: 220, dur: 0.7, vol: 0.12, type: 'sawtooth', filter: { freq: 300, to: 2400 } });
        [[69, 73, 76], [71, 74, 78], [73, 76, 81]].forEach((ch, i) =>
          ch.forEach((n) => this.tone({ freq: NOTE(n), t: now + 0.55 + i * 0.16, dur: i === 2 ? 0.9 : 0.18, vol: 0.06, type: 'sawtooth', filter: { freq: 3200 } })),
        );
        break;
      case 'taskStart':
        this.tone({ freq: 880, dur: 0.1, vol: 0.08, type: 'square', filter: { freq: 3000 } });
        this.tone({ freq: 660, t: now + 0.12, dur: 0.1, vol: 0.08, type: 'square', filter: { freq: 3000 } });
        this.tone({ freq: 880, t: now + 0.24, dur: 0.14, vol: 0.08, type: 'square', filter: { freq: 3000 } });
        break;
      case 'taskOk':
        [72, 76, 79, 84].forEach((n, i) => this.tone({ freq: NOTE(n), t: now + i * 0.07, dur: 0.25, vol: 0.09, type: 'triangle' }));
        break;
      case 'taskFail':
        this.tone({ freq: 392, dur: 0.18, vol: 0.09, type: 'square', filter: { freq: 1400 } });
        this.tone({ freq: 294, t: now + 0.18, dur: 0.35, vol: 0.09, type: 'square', filter: { freq: 1400 } });
        break;
      case 'tick':
        this.tone({ freq: 1500, dur: 0.04, vol: 0.05, type: 'square', filter: { freq: 5000 } });
        break;
      case 'good':
        this.tone({ freq: NOTE(84 + (opt.n || 0)), dur: 0.15, vol: 0.08, type: 'triangle' });
        break;
      case 'bad':
        this.tone({ freq: 160, dur: 0.18, vol: 0.12, type: 'square', filter: { freq: 900 } });
        break;
      case 'click':
        this.tone({ freq: 1100, dur: 0.05, vol: 0.05, type: 'triangle' });
        break;
      case 'mult':
        this.tone({ freq: NOTE(79), dur: 0.12, vol: 0.07, type: 'square', filter: { freq: 3000 } });
        this.tone({ freq: NOTE(86), t: now + 0.08, dur: 0.2, vol: 0.07, type: 'square', filter: { freq: 3000 } });
        break;
      case 'city':
        [69, 76, 81].forEach((n, i) => this.tone({ freq: NOTE(n), t: now + i * 0.1, dur: 0.4, vol: 0.05, type: 'triangle' }));
        break;
      case 'achievement':
        [79, 83, 86, 91].forEach((n, i) => this.tone({ freq: NOTE(n), t: now + i * 0.09, dur: 0.35, vol: 0.07, type: 'triangle' }));
        break;
      case 'record':
        [[72, 76, 79], [74, 77, 81], [76, 79, 84]].forEach((ch, i) =>
          ch.forEach((n) => this.tone({ freq: NOTE(n), t: now + i * 0.18, dur: i === 2 ? 1.2 : 0.2, vol: 0.06, type: 'sawtooth', filter: { freq: 3500 } })),
        );
        break;
      case 'revive':
        this.tone({ freq: 300, slide: 1200, dur: 0.5, vol: 0.08, type: 'triangle' });
        break;
      default:
    }
  }

  // ------------------------------------------------------------------------
  // Music sequencer
  // ------------------------------------------------------------------------
  startMusic(mode) {
    if (!this.ctx) return;
    if (this.mode === mode) return;
    this.mode = mode;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    this.mode = null;
    clearInterval(this.timer);
    this.timer = null;
  }

  setIntensity(k) {
    this.intensity = Math.max(0, Math.min(1, k));
  }

  schedule() {
    if (!this.ctx || !this.mode) return;
    const bpm = this.mode === 'run' ? 122 + this.intensity * 18 : 96;
    const st = 60 / bpm / 4; // 16th note
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime, st);
      this.nextTime += st;
      this.step++;
    }
  }

  playStep(step, t, st) {
    const m = this.musicGain;
    const s16 = step % 16;
    const bar = Math.floor(step / 16);
    if (this.mode === 'menu') {
      const ch = MENU_PROG[bar % 4];
      if (s16 === 0) ch.chord.forEach((n) => this.tone({ freq: NOTE(n), t, dur: st * 15, vol: 0.035, type: 'sawtooth', attack: 0.3, filter: { freq: 900 }, dest: m, detune: 6 }));
      if (s16 === 0 || s16 === 8) this.tone({ freq: NOTE(ch.root - 12), t, dur: st * 7, vol: 0.09, type: 'triangle', dest: m });
      if (s16 % 2 === 0) {
        const n = ch.chord[(s16 / 2) % 3] + 12 * (s16 >= 8 ? 1 : 0);
        this.tone({ freq: NOTE(n), t, dur: st * 1.6, vol: 0.035, type: 'triangle', dest: m });
      }
      if (s16 === 4 || s16 === 12) this.noiseBurst({ t, dur: 0.05, vol: 0.025, type: 'highpass', freq: 7000, dest: m });
      return;
    }
    // run mode
    const ch = RUN_PROG[bar % 4];
    const k = this.intensity;
    // kick
    if (s16 % 4 === 0) {
      this.tone({ freq: 150, slide: 45, t, dur: 0.22, vol: 0.38, dest: m });
    }
    // clap / snare on 2 & 4
    if (s16 === 4 || s16 === 12) {
      this.noiseBurst({ t, dur: 0.16, vol: 0.16, type: 'bandpass', freq: 1800, q: 0.9, dest: m });
      this.tone({ freq: 220, slide: 160, t, dur: 0.08, vol: 0.06, type: 'triangle', dest: m });
    }
    // hats
    if (s16 % 2 === 0) this.noiseBurst({ t, dur: 0.035, vol: 0.035, type: 'highpass', freq: 8000, dest: m });
    if (s16 % 4 === 2) this.noiseBurst({ t, dur: 0.12, vol: 0.04, type: 'highpass', freq: 6500, dest: m });
    // bass: driving eighths with octave jumps
    if (s16 % 2 === 0) {
      const oct = s16 % 8 === 6 ? 12 : 0;
      this.tone({ freq: NOTE(ch.root - 12 + oct), t, dur: st * 1.8, vol: 0.14, type: 'sawtooth', filter: { freq: 520 + k * 500 }, dest: m });
    }
    // pad
    if (s16 === 0) ch.chord.forEach((n) => this.tone({ freq: NOTE(n), t, dur: st * 15, vol: 0.02, type: 'sawtooth', attack: 0.08, filter: { freq: 1400 }, dest: m, detune: 8 }));
    // arpeggio
    const arp = [0, 1, 2, 1, 2, 0, 1, 2];
    const n = ch.chord[arp[s16 % 8]] + 12;
    this.tone({ freq: NOTE(n), t, dur: st * 0.9, vol: 0.022 + k * 0.012, type: 'square', filter: { freq: 2200 + k * 1500 }, dest: m });
    // hook every other 4 bars
    if (Math.floor(bar / 4) % 2 === 1) {
      const h = HOOK[s16];
      if (h) this.tone({ freq: NOTE(h - (bar % 4 === 1 ? 2 : 0)), t, dur: st * 1.8, vol: 0.045, type: 'triangle', dest: m });
    }
  }
}

export const audio = new AudioEngine();
