/** Small WebAudio wrapper: master/sfx/music buses, unlock on first user gesture, shared noise. */
export class AudioEngine {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  readonly sfx: GainNode;
  readonly music: GainNode;
  private noise: AudioBuffer;
  private muffler: BiquadFilterNode;
  private unlock: () => void;

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    this.sfx = this.bus(0.9);
    this.muffler = this.ctx.createBiquadFilter();
    this.muffler.type = 'lowpass';
    this.muffler.frequency.value = 20000;
    this.sfx.disconnect();
    this.sfx.connect(this.muffler).connect(this.master);
    this.music = this.bus(0.35);
    // Two seconds of white noise, reused by every noisy sound.
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    // Browsers keep audio suspended until the user interacts with the page.
    this.unlock = () => {
      void this.ctx.resume();
      window.removeEventListener('pointerdown', this.unlock);
      window.removeEventListener('keydown', this.unlock);
    };
    window.addEventListener('pointerdown', this.unlock);
    window.addEventListener('keydown', this.unlock);
  }

  private bus(volume: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = volume;
    g.connect(this.master);
    return g;
  }

  get now(): number {
    return this.ctx.currentTime;
  }

  /** Output chain for one sound: volume and stereo position. */
  out(volume: number, pan: number, endPan = pan, duration = 0): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = volume;
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    if (duration > 0)
      p.pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, endPan)), this.now + duration);
    g.connect(p).connect(this.sfx);
    return g;
  }

  /** Brief loss of high frequencies, no tinnitus tone or persistent volume change. */
  muffle(): void {
    const f = this.muffler.frequency,
      t = this.now;
    f.cancelScheduledValues(t);
    f.setValueAtTime(1600, t);
    f.exponentialRampToValueAtTime(20000, t + 0.32);
  }

  destroy(): void {
    window.removeEventListener('pointerdown', this.unlock);
    window.removeEventListener('keydown', this.unlock);
    void this.ctx.close().catch(() => {});
  }

  noiseSource(): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.loopStart = Math.random();
    return src;
  }

  /** Attack/decay envelope on a gain param. */
  env(param: AudioParam, t: number, peak: number, attack: number, decay: number): void {
    param.cancelScheduledValues(t);
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
}
