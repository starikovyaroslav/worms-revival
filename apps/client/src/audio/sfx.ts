import { AudioEngine } from './engine';
import { SOUNDS } from './sounds';

/** Plays simulation sounds positioned relative to the camera. */
export class Sfx {
  private engine: AudioEngine | null = null;
  private recent = new Map<string, number>();
  muted = false;

  private get audio(): AudioEngine {
    this.engine ??= new AudioEngine();
    return this.engine;
  }

  /**
   * @param x world position of the sound
   * @param view camera centre and half-width of the visible area, for panning and fading
   */
  play(
    id: string,
    x: number,
    y: number,
    view: { x: number; y: number; halfW: number },
    size = 0.5,
  ): void {
    if (this.muted) return;
    const synth = SOUNDS[id];
    if (!synth) return;
    const a = this.audio;
    if (a.ctx.state !== 'running') return;
    // Don't stack the same sound many times in one instant (cluster bombs, flames).
    const last = this.recent.get(id) ?? -1;
    if (a.now - last < 0.03) return;
    this.recent.set(id, a.now);
    const dx = (x - view.x) / Math.max(1, view.halfW);
    const dy = (y - view.y) / Math.max(1, view.halfW);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const volume = Math.max(0.15, 1 - Math.max(0, dist - 0.8) * 0.5);
    synth(a, a.out(volume, dx * 0.8), size);
  }

  /**
   * Cartoon gibberish voice: a burst of formant "syllables" whose pitch is fixed per worm, so
   * every worm sounds a little different.
   */
  babble(length: number, voiceSeed: number, panX: number): void {
    if (this.muted) return;
    const a = this.audio;
    if (a.ctx.state !== 'running') return;
    const out = a.out(0.5, Math.max(-1, Math.min(1, panX / 600)));
    const base = 380 + ((voiceSeed * 97) % 9) * 45;
    const syllables = Math.min(9, Math.max(2, Math.round(length / 3)));
    for (let i = 0; i < syllables; i++) {
      const t = a.now + i * 0.075;
      const g = a.ctx.createGain();
      a.env(g.gain, t, 0.18, 0.01, 0.06);
      const bq = a.ctx.createBiquadFilter();
      bq.type = 'bandpass';
      bq.frequency.value = 900 + Math.random() * 1400;
      bq.Q.value = 4;
      bq.connect(g).connect(out);
      const o = a.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(base * (0.85 + Math.random() * 0.4), t);
      o.connect(bq);
      o.start(t);
      o.stop(t + 0.09);
    }
  }

  /** Non-positional UI sound. */
  ui(id: string): void {
    this.play(id, 0, 0, { x: 0, y: 0, halfW: 1 });
  }
}
