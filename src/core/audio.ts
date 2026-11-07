// Original chiptune + SFX with the WebAudio API. No audio files. Muted by default; the choice is remembered.
import { TRACKS, type Track } from './music';
import { loadSettings, saveSettings } from './save';

type Wave = 'square' | 'triangle' | 'sawtooth' | 'pulse25' | 'pulse12' | 'noise';
export type Sfx =
  | 'move' | 'select' | 'back' | 'save' | 'hit' | 'graze' | 'door' | 'secret' | 'alert' | 'heal' | 'error' | 'buy'
  | 'slash' | 'spare' | 'reset' | 'step' | 'build';
export type Voice = 'narrator' | 'wael' | 'shop' | 'mirror' | 'bot' | 'enemy' | 'pip' | 'hoot' | 'knight' | 'keeper' | 'tiny';

const NOTE: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export function freq(n: string): number {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  if (!m) return 0;
  const midi = 12 * (Number(m[2]) + 1) + NOTE[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class AudioEngine {
  muted = loadSettings().muted;
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private waves: Partial<Record<Wave, PeriodicWave>> = {};
  private noiseBuf: AudioBuffer | null = null;
  private track: Track | null = null;
  private trackId = '';
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private lastBlip = 0;
  listeners: ((muted: boolean) => void)[] = [];

  /** Must be called from a user gesture the first time. */
  unlock() {
    if (this.muted) return;
    this.ensure();
    void this.ctx?.resume();
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new C();
    } catch {
      return null;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.28;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.5;
    this.sfxBus.connect(this.master);
    const pulse = (duty: number) => {
      const N = 32;
      const re = new Float32Array(N), im = new Float32Array(N);
      for (let k = 1; k < N; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      return ctx.createPeriodicWave(re, im);
    };
    this.waves.pulse25 = pulse(0.25);
    this.waves.pulse12 = pulse(0.125);
    const len = ctx.sampleRate * 0.5;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
    saveSettings({ ...loadSettings(), muted: m });
    if (!m) {
      this.ensure();
      void this.ctx?.resume();
      if (this.trackId) this.startSequencer();
    } else {
      this.stopSequencer();
      void this.ctx?.suspend();
    }
    this.listeners.forEach((f) => f(m));
  }
  toggle() {
    this.setMuted(!this.muted);
  }

  /** One enveloped note. */
  private tone(wave: Wave, f: number, t: number, dur: number, vol: number, bus: GainNode, slideTo?: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.setValueAtTime(vol, t + Math.max(0.006, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(bus);
    if (wave === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const filt = ctx.createBiquadFilter();
      filt.type = 'highpass';
      filt.frequency.value = f || 3000;
      src.connect(filt).connect(g);
      src.start(t);
      src.stop(t + dur + 0.02);
      return;
    }
    const o = ctx.createOscillator();
    if (wave === 'pulse25' || wave === 'pulse12') o.setPeriodicWave(this.waves[wave]!);
    else o.type = wave;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  sfx(name: Sfx) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.01;
    const B = this.sfxBus;
    const seq = (wave: Wave, notes: string[], gap: number, dur: number, vol = 0.3) =>
      notes.forEach((n, i) => this.tone(wave, freq(n), t + i * gap, dur, vol, B));
    switch (name) {
      case 'move': this.tone('square', 880, t, 0.035, 0.12, B); break;
      case 'select': seq('square', ['E5', 'B5'], 0.05, 0.07, 0.18); break;
      case 'back': seq('square', ['B5', 'E5'], 0.05, 0.07, 0.14); break;
      case 'save': seq('pulse25', ['C5', 'E5', 'G5', 'C6', 'E6'], 0.07, 0.16, 0.22); this.tone('triangle', freq('C4'), t, 0.5, 0.2, B); break;
      case 'hit': this.tone('square', 220, t, 0.18, 0.3, B, 60); this.tone('noise', 800, t, 0.12, 0.25, B); break;
      case 'graze': this.tone('pulse12', 1760, t, 0.03, 0.08, B); break;
      case 'door': this.tone('triangle', 330, t, 0.18, 0.25, B, 110); break;
      case 'secret': seq('pulse25', ['G5', 'A5', 'B5', 'D6', 'G6', 'B6'], 0.06, 0.12, 0.2); break;
      case 'alert': seq('square', ['A5', 'A5'], 0.09, 0.07, 0.22); break;
      case 'heal': this.tone('triangle', 440, t, 0.25, 0.25, B, 1320); break;
      case 'error': this.tone('square', 110, t, 0.16, 0.2, B); break;
      case 'buy': seq('square', ['C6', 'G6'], 0.06, 0.08, 0.15); break;
      case 'slash': this.tone('noise', 1200, t, 0.22, 0.3, B); this.tone('sawtooth', 900, t, 0.2, 0.12, B, 120); break;
      case 'spare': seq('triangle', ['C5', 'G5', 'C6'], 0.08, 0.2, 0.25); break;
      case 'reset': this.tone('square', 600, t, 0.3, 0.2, B, 90); break;
      case 'step': this.tone('noise', 5000, t, 0.02, 0.05, B); break;
      case 'build': seq('pulse12', ['E5', 'G5'], 0.04, 0.05, 0.12); break;
    }
  }

  /** Typing blip, one per visible character (rate-limited). */
  blip(voice: Voice = 'narrator') {
    if (this.muted) return;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (now - this.lastBlip < 0.045) return;
    this.lastBlip = now;
    const r = 1 + (Math.random() - 0.5) * 0.06;
    const V: Record<Voice, [Wave, number, number]> = {
      narrator: ['square', 330, 0.07], wael: ['pulse25', 523, 0.08], shop: ['square', 196, 0.08],
      mirror: ['triangle', 784, 0.12], bot: ['pulse12', 1046, 0.06], enemy: ['sawtooth', 147, 0.06],
      pip: ['pulse25', 880, 0.06], hoot: ['triangle', 262, 0.14], knight: ['square', 247, 0.07], keeper: ['triangle', 196, 0.1],
      tiny: ['pulse12', 1318, 0.05],
    };
    const [w, f, v] = V[voice];
    this.tone(w, f * r, now + 0.005, 0.04, v, this.sfxBus);
  }

  music(id: string) {
    if (id === this.trackId) return;
    this.trackId = id;
    this.track = TRACKS[id] ?? null;
    this.step = 0;
    if (!this.muted) this.startSequencer();
  }

  private startSequencer() {
    this.stopSequencer();
    const ctx = this.ensure();
    if (!ctx || !this.track) return;
    this.nextTime = ctx.currentTime + 0.08;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }
  private stopSequencer() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
  private schedule() {
    const ctx = this.ctx;
    const tr = this.track;
    if (!ctx || !tr || ctx.state !== 'running') return;
    const stepDur = 60 / tr.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      for (const ch of tr.ch) {
        const pat = ch.p;
        const i = this.step % pat.length;
        const tok = pat[i];
        if (tok === '.' || tok === '-') continue;
        let len = 1;
        while (pat[(i + len) % pat.length] === '-' && len < pat.length) len++;
        const dur = Math.max(0.05, len * stepDur * (ch.gate ?? 0.9));
        if (ch.w === 'noise') this.tone('noise', tok === 'x' ? 6000 : 2500, this.nextTime, tok === 'x' ? 0.04 : 0.09, ch.v, this.musicBus);
        else this.tone(ch.w, freq(tok), this.nextTime, dur, ch.v, this.musicBus);
      }
      this.step++;
      this.nextTime += stepDur;
    }
  }
}

export const audio = new AudioEngine();
