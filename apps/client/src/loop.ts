import { TICK_MS } from '@wr/sim';
import { showFatal } from './fatal';

/** Never simulate more than this many ticks per frame (e.g. after the tab was hidden). */
const MAX_TICKS_PER_FRAME = 10;

/**
 * Runs the simulation at a fixed tick rate (`TPS`) and rendering at display rate. `render` receives the
 * fraction of a tick elapsed since the last step, for interpolating positions.
 */
export class FixedLoop {
  private acc = 0;
  private last = 0;
  private raf = 0;
  /** Simulation speed multiplier (replays, debugging). */
  speed = 1;
  /**
   * Pause: no simulation ticks, and no catch-up afterwards. Nothing is stepped, so the command log
   * of a recording or replay is untouched; frames are still drawn (resize, UI) but time stands still.
   */
  paused = false;

  constructor(
    private readonly step: () => void,
    private readonly render: (alpha: number, dtMs: number) => void,
  ) {}

  start(): void {
    this.last = performance.now();
    const frame = (now: number) => {
      try {
        const dt = Math.min(now - this.last, 250);
        this.last = now;
        let ticks = 0;
        if (!this.paused) {
          this.acc += dt * this.speed;
          while (this.acc >= TICK_MS && ticks < MAX_TICKS_PER_FRAME) {
            this.step();
            this.acc -= TICK_MS;
            ticks++;
          }
          if (ticks === MAX_TICKS_PER_FRAME) this.acc = 0;
        }
        this.render(this.acc / TICK_MS, this.paused ? 0 : dt);
      } catch (err) {
        // A broken frame must not repeat 60 times a second: stop and tell the player.
        showFatal('runtime', err);
        return;
      }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }
}
