import { TICK_MS } from '@wr/sim';

/** Never simulate more than this many ticks per frame (e.g. after the tab was hidden). */
const MAX_TICKS_PER_FRAME = 10;

/**
 * Runs the simulation at a fixed 50 Hz and rendering at display rate. `render` receives the
 * fraction of a tick elapsed since the last step, for interpolating positions.
 */
export class FixedLoop {
  private acc = 0;
  private last = 0;
  private raf = 0;
  /** Simulation speed multiplier (replays, debugging). */
  speed = 1;

  constructor(
    private readonly step: () => void,
    private readonly render: (alpha: number, dtMs: number) => void,
  ) {}

  start(): void {
    this.last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(now - this.last, 250);
      this.last = now;
      this.acc += dt * this.speed;
      let ticks = 0;
      while (this.acc >= TICK_MS && ticks < MAX_TICKS_PER_FRAME) {
        this.step();
        this.acc -= TICK_MS;
        ticks++;
      }
      if (ticks === MAX_TICKS_PER_FRAME) this.acc = 0;
      this.render(this.acc / TICK_MS, dt);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }
}
