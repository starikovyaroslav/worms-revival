import type { AudioEngine } from './engine';

type Synth = (a: AudioEngine, out: GainNode, size: number) => void;

function osc(
  a: AudioEngine,
  type: OscillatorType,
  freq: number,
  out: AudioNode,
  t: number,
  dur: number,
): OscillatorNode {
  const o = a.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}

function noise(
  a: AudioEngine,
  out: AudioNode,
  t: number,
  dur: number,
  filter: BiquadFilterType,
  f0: number,
  f1: number,
  q = 1,
) {
  const src = a.noiseSource();
  const bq = a.ctx.createBiquadFilter();
  bq.type = filter;
  bq.Q.value = q;
  bq.frequency.setValueAtTime(f0, t);
  bq.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  src.connect(bq).connect(out);
  src.start(t);
  src.stop(t + dur + 0.05);
  return bq;
}

function voice(
  a: AudioEngine,
  out: GainNode,
  peak: number,
  attack: number,
  decay: number,
): GainNode {
  const g = a.ctx.createGain();
  a.env(g.gain, a.now, peak, attack, decay);
  g.connect(out);
  return g;
}

/** Procedural sound effects, keyed by the ids the simulation emits. */
export const SOUNDS: Record<string, Synth> = {
  explosion: (a, out, size) => {
    const t = a.now;
    const dur = 0.5 + size * 0.9;
    noise(a, voice(a, out, 1, 0.005, dur), t, dur, 'lowpass', 2400 + size * 1500, 60);
    // Sub thump.
    const sub = voice(a, out, 0.9, 0.005, 0.35 + size * 0.3);
    const o = osc(a, 'sine', 110, sub, t, 0.6);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.5);
  },
  splash: (a, out, size) => {
    noise(a, voice(a, out, 0.6, 0.01, 0.4 + size * 0.4), a.now, 0.8, 'bandpass', 1800, 400, 0.8);
  },
  shotgun: (a, out) => {
    noise(a, voice(a, out, 0.9, 0.002, 0.25), a.now, 0.3, 'lowpass', 6000, 300);
  },
  shot: (a, out) => {
    noise(a, voice(a, out, 0.35, 0.001, 0.06), a.now, 0.08, 'highpass', 2500, 1200);
  },
  launch: (a, out) => {
    noise(a, voice(a, out, 0.4, 0.02, 0.4), a.now, 0.45, 'bandpass', 400, 2500, 2);
  },
  throw: (a, out) => {
    noise(a, voice(a, out, 0.25, 0.03, 0.2), a.now, 0.25, 'bandpass', 900, 1800, 3);
  },
  bounce: (a, out) => {
    const o = osc(a, 'triangle', 320, voice(a, out, 0.25, 0.002, 0.08), a.now, 0.1);
    o.frequency.exponentialRampToValueAtTime(180, a.now + 0.08);
  },
  'worm-bounce': (a, out) => {
    const o = osc(a, 'sine', 160, voice(a, out, 0.35, 0.003, 0.12), a.now, 0.15);
    o.frequency.exponentialRampToValueAtTime(70, a.now + 0.12);
  },
  'fall-hurt': (a, out) => {
    const o = osc(a, 'square', 420, voice(a, out, 0.15, 0.01, 0.25), a.now, 0.3);
    o.frequency.exponentialRampToValueAtTime(140, a.now + 0.25);
  },
  punch: (a, out) => {
    noise(a, voice(a, out, 0.7, 0.003, 0.15), a.now, 0.2, 'lowpass', 1200, 200);
    osc(a, 'sine', 90, voice(a, out, 0.7, 0.003, 0.15), a.now, 0.2);
  },
  bat: (a, out) => {
    const o = osc(a, 'triangle', 900, voice(a, out, 0.5, 0.002, 0.18), a.now, 0.2);
    o.frequency.exponentialRampToValueAtTime(500, a.now + 0.15);
    noise(a, voice(a, out, 0.4, 0.002, 0.1), a.now, 0.12, 'highpass', 3000, 2000);
  },
  prod: (a, out) => {
    osc(a, 'sine', 220, voice(a, out, 0.3, 0.005, 0.1), a.now, 0.12);
  },
  swish: (a, out) => {
    noise(a, voice(a, out, 0.25, 0.04, 0.15), a.now, 0.2, 'bandpass', 600, 3000, 4);
  },
  'mine-beep': (a, out) => {
    for (let i = 0; i < 3; i++)
      osc(a, 'square', 1400, voice(a, out, 0.12, 0.002, 0.06), a.now + i * 0.12, 0.06);
  },
  dud: (a, out) => {
    noise(a, voice(a, out, 0.3, 0.05, 0.8), a.now, 0.9, 'highpass', 2000, 6000, 0.5);
  },
  baa: (a, out) => {
    // Bleat: nasal saw with a wobbly pitch through a formant filter.
    const t = a.now;
    const g = voice(a, out, 0.35, 0.03, 0.5);
    const bq = a.ctx.createBiquadFilter();
    bq.type = 'bandpass';
    bq.frequency.value = 1100;
    bq.Q.value = 3;
    bq.connect(g);
    const o = osc(a, 'sawtooth', 340, bq, t, 0.6);
    const lfo = osc(a, 'sine', 22, a.ctx.createGain(), t, 0.6);
    const depth = a.ctx.createGain();
    depth.gain.value = 25;
    lfo.disconnect();
    lfo.connect(depth).connect(o.frequency);
    o.frequency.linearRampToValueAtTime(300, t + 0.5);
  },
  'sheep-fly': (a, out) => {
    const o = osc(a, 'sawtooth', 200, voice(a, out, 0.2, 0.05, 0.6), a.now, 0.7);
    o.frequency.exponentialRampToValueAtTime(900, a.now + 0.6);
  },
  hallelujah: (a, out) => {
    // A short choir swell: detuned saws on a major chord through a vowel filter.
    const t = a.now;
    const g = a.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.25);
    g.gain.setValueAtTime(0.25, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    const vowel = a.ctx.createBiquadFilter();
    vowel.type = 'bandpass';
    vowel.frequency.value = 900;
    vowel.Q.value = 1.2;
    vowel.connect(g).connect(out);
    for (const f of [261.6, 329.6, 392, 523.3]) {
      for (const d of [-6, 6]) {
        const o = osc(a, 'sawtooth', f, vowel, t, 1.3);
        o.detune.value = d;
      }
    }
  },
  collect: (a, out) => {
    [523, 659, 784, 1047].forEach((f, i) =>
      osc(a, 'triangle', f, voice(a, out, 0.2, 0.005, 0.15), a.now + i * 0.06, 0.15),
    );
  },
  'rope-shoot': (a, out) => {
    const o = osc(a, 'sawtooth', 1200, voice(a, out, 0.08, 0.005, 0.12), a.now, 0.15);
    o.frequency.exponentialRampToValueAtTime(300, a.now + 0.12);
  },
  'rope-attach': (a, out) => {
    osc(a, 'square', 180, voice(a, out, 0.12, 0.002, 0.05), a.now, 0.06);
  },
  'rope-miss': (a, out) => {
    osc(a, 'sine', 300, voice(a, out, 0.1, 0.005, 0.1), a.now, 0.12);
  },
  parachute: (a, out) => {
    noise(a, voice(a, out, 0.3, 0.02, 0.4), a.now, 0.45, 'lowpass', 900, 300);
  },
  teleport: (a, out) => {
    const o = osc(a, 'sine', 300, voice(a, out, 0.2, 0.01, 0.35), a.now, 0.4);
    o.frequency.exponentialRampToValueAtTime(2400, a.now + 0.35);
  },
  girder: (a, out) => {
    osc(a, 'square', 140, voice(a, out, 0.25, 0.002, 0.25), a.now, 0.3);
    osc(a, 'square', 211, voice(a, out, 0.15, 0.002, 0.2), a.now, 0.25);
  },
  torch: (a, out) => {
    noise(a, voice(a, out, 0.1, 0.01, 0.12), a.now, 0.15, 'bandpass', 2500, 2000, 2);
  },
  drill: (a, out) => {
    osc(a, 'square', 60, voice(a, out, 0.12, 0.005, 0.1), a.now, 0.12);
    noise(a, voice(a, out, 0.12, 0.005, 0.1), a.now, 0.12, 'lowpass', 900, 600);
  },
  airstrike: (a, out) => {
    const o = osc(a, 'sawtooth', 90, voice(a, out, 0.25, 0.4, 1.2), a.now, 1.7);
    o.frequency.linearRampToValueAtTime(70, a.now + 1.6);
    noise(a, voice(a, out, 0.2, 0.4, 1.2), a.now, 1.7, 'lowpass', 700, 300);
  },
  nope: (a, out) => {
    osc(a, 'square', 110, voice(a, out, 0.15, 0.005, 0.2), a.now, 0.25);
  },
  tick: (a, out) => {
    osc(a, 'square', 1800, voice(a, out, 0.08, 0.001, 0.03), a.now, 0.04);
  },
  'turn-start': (a, out) => {
    [392, 523].forEach((f, i) =>
      osc(a, 'triangle', f, voice(a, out, 0.15, 0.005, 0.2), a.now + i * 0.1, 0.2),
    );
  },
  charge: (a, out) => {
    const o = osc(a, 'sine', 200, voice(a, out, 0.06, 0.01, 1), a.now, 1.1);
    o.frequency.linearRampToValueAtTime(900, a.now + 1.1);
  },
};
