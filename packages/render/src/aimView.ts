import { Container, Graphics } from 'pixi.js';
import type { Worm } from '@wr/sim';

const CROSSHAIR_DIST = 45;

/** W:A-style crosshair and the growing "cone" of the power bar. */
export class AimView {
  readonly container = new Container();
  private g = new Graphics();

  constructor() {
    this.container.addChild(this.g);
  }

  update(worm: Worm | null, alpha: number, show: boolean, power: number, charging: boolean): void {
    const g = this.g.clear();
    if (!worm || !show || !(worm.grounded || worm.state === 'roped')) return;
    const x = worm.prevX + (worm.x - worm.prevX) * alpha;
    const y = worm.prevY + (worm.y - worm.prevY) * alpha - 6.5;
    const dx = Math.cos(worm.aim) * worm.facing;
    const dy = -Math.sin(worm.aim);

    if (charging) {
      const n = Math.max(1, Math.round(power * 16));
      for (let i = 0; i < n; i++) {
        const t = i / 16;
        const r = 1.5 + t * 6;
        const d = 8 + t * 52;
        // Yellow → red as the shot gets stronger.
        const color = (255 << 16) | (Math.round(230 * (1 - t)) << 8);
        g.circle(x + dx * d, y + dy * d, r).fill({ color, alpha: 0.85 });
      }
    }
    const cx = x + dx * CROSSHAIR_DIST;
    const cy = y + dy * CROSSHAIR_DIST;
    g.circle(cx, cy, 5).stroke({ color: 0xff2020, width: 2 });
    g.moveTo(cx - 8, cy)
      .lineTo(cx - 3, cy)
      .moveTo(cx + 3, cy)
      .lineTo(cx + 8, cy);
    g.moveTo(cx, cy - 8)
      .lineTo(cx, cy - 3)
      .moveTo(cx, cy + 3)
      .lineTo(cx, cy + 8);
    g.stroke({ color: 0xff2020, width: 1.5 });
  }
}
