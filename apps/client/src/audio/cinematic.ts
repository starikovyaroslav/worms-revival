import type { AudioEngine } from './engine';

export type CinematicSound =
  'flyby-attack' | 'flyby-gunship' | 'flyby-stealth' | 'launch-heavy' | 'impact-heavy';

/** Original synthesized sounds: no external recordings or simulation-side sound ids. */
export function cinematicSound(a: AudioEngine, out: GainNode, id: CinematicSound): void {
  const t = a.now;
  const flight = id.startsWith('flyby-');
  const duration = flight
    ? id === 'flyby-stealth'
      ? 2.8
      : id === 'flyby-gunship'
        ? 2.2
        : 1.8
    : id === 'impact-heavy'
      ? 1.3
      : 0.45;
  const gain = a.ctx.createGain();
  a.env(
    gain.gain,
    t,
    flight ? 0.35 : 0.55,
    flight ? 0.18 : 0.006,
    duration - (flight ? 0.18 : 0.006),
  );
  gain.connect(out);
  const filter = a.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(flight ? 550 : 1800, t);
  filter.frequency.exponentialRampToValueAtTime(100, t + duration);
  filter.connect(gain);
  const noise = a.noiseSource();
  noise.connect(filter);
  noise.start(t);
  noise.stop(t + duration);
  const o = a.ctx.createOscillator();
  o.type = id === 'flyby-gunship' ? 'triangle' : 'sine';
  o.frequency.setValueAtTime(id === 'launch-heavy' ? 160 : id === 'flyby-gunship' ? 92 : 68, t);
  o.frequency.exponentialRampToValueAtTime(flight ? 40 : 27, t + duration);
  o.connect(gain);
  o.start(t);
  o.stop(t + duration);
  if (id === 'flyby-gunship') {
    const pulse = a.ctx.createOscillator();
    const modulation = a.ctx.createGain();
    pulse.frequency.value = 22;
    modulation.gain.value = 0.055;
    pulse.connect(modulation).connect(gain.gain);
    pulse.start(t);
    pulse.stop(t + duration);
  }
  o.onended = () => {
    out.disconnect();
    gain.disconnect();
    filter.disconnect();
  };
}
