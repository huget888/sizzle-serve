// Sizzle & Serve — all sound is synthesized with WebAudio: no audio files,
// no network, nothing to load. Short effects for chopping, sizzling, serving
// and coins, plus a light kitchen tune that hurries up in the rush hour.
// Everything is guarded: in a headless browser the audio context may stay
// suspended, and the game must never throw over sound.

const NOTE = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0 };

// A cheerful loop: bass on the beat, a plucky melody over it. Rush mode
// plays the same tune a third faster.
const TUNE = {
  bass: ['C3', 'G2', 'A2', 'F2', 'C3', 'G2', 'F2', 'G2'],
  melody: ['E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'E4', 'C4', 'E4', 'G4', 'A4', 'C5', 'A4', 'G4', 'E4', 'D4'],
};
const FREQ = { C3: 130.81, G2: 98.0, A2: 110.0, F2: 87.31, ...NOTE };

export class KitchenAudio {
  constructor() {
    this.context = null;
    this.muted = false;
    this.musicTimer = null;
    this.sizzleNodes = null;
    this.step = 0;
  }

  /** Create the context on the first user gesture; safe to call any time. */
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
    } catch {
      this.context = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopSizzle();
    return this.muted;
  }

  tone(freq, seconds, type, volume, when = 0) {
    if (!this.context || this.muted) return;
    try {
      const t0 = this.context.currentTime + when;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start(t0);
      osc.stop(t0 + seconds + 0.05);
    } catch { /* sound must never break the game */ }
  }

  /** A burst of filtered noise: a chop, a sizzle tick, a trash thud. */
  noise(seconds, filterFreq, volume, when = 0) {
    if (!this.context || this.muted) return;
    try {
      const t0 = this.context.currentTime + when;
      const length = Math.max(1, Math.floor(this.context.sampleRate * seconds));
      const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFreq;
      const gain = this.context.createGain();
      gain.gain.value = volume;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.context.destination);
      source.start(t0);
    } catch { /* sound must never break the game */ }
  }

  chop() { this.noise(0.07, 1800, 0.35); this.tone(140, 0.08, 'triangle', 0.25); }
  pickup() { this.tone(520, 0.07, 'sine', 0.18); }
  place() { this.tone(340, 0.08, 'sine', 0.18); }
  ding() { this.tone(880, 0.25, 'sine', 0.25); this.tone(1318, 0.3, 'sine', 0.18, 0.08); }
  coin() { this.tone(988, 0.09, 'square', 0.12); this.tone(1319, 0.14, 'square', 0.12, 0.08); }
  error() { this.tone(160, 0.18, 'sawtooth', 0.15); }
  burn() { this.noise(0.25, 500, 0.3); this.tone(110, 0.3, 'sawtooth', 0.15); }
  tick() { this.tone(1200, 0.04, 'sine', 0.12); }

  /** A continuous sizzle while something fries or boils. Call again to keep it. */
  startSizzle() {
    if (!this.context || this.muted || this.sizzleNodes) return;
    try {
      const length = this.context.sampleRate;
      const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = this.context.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3000;
      const gain = this.context.createGain();
      gain.gain.value = 0.045;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.context.destination);
      source.start();
      this.sizzleNodes = { source, gain };
    } catch { this.sizzleNodes = null; }
  }

  stopSizzle() {
    if (!this.sizzleNodes) return;
    try { this.sizzleNodes.source.stop(); } catch { /* already stopped */ }
    this.sizzleNodes = null;
  }

  /** Start the kitchen tune. `rush` plays it faster. */
  startMusic(rush) {
    if (!this.context || this.musicTimer) return;
    const beat = rush ? 0.24 : 0.34;
    const playStep = () => {
      if (this.muted) return;
      const bass = TUNE.bass[this.step % TUNE.bass.length];
      const mel = TUNE.melody[this.step % TUNE.melody.length];
      this.tone(FREQ[bass], beat * 0.9, 'triangle', 0.16);
      if (this.step % 2 === 0) this.tone(FREQ[mel], beat * 0.8, 'sine', 0.1);
      this.step += 1;
    };
    playStep();
    this.musicTimer = window.setInterval(playStep, beat * 1000);
  }

  setRush(rush) {
    if (!this.musicTimer) return;
    window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.startMusic(rush);
  }

  stopMusic() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.stopSizzle();
  }
}
