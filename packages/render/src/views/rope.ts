import { Container, Graphics } from 'pixi.js';
import { Worm, type Rope } from '@wr/sim';
import { OUTLINE, type EntityView, type ViewContext } from './common';

export class RopeView implements EntityView {
  readonly container = new Container();
  private g = new Graphics();

  constructor(
    private readonly r: Rope,
    private readonly ctx: ViewContext,
  ) {
    this.container.addChild(this.g);
  }

  update(alpha: number): void {
    const g = this.g.clear();
    const worm = this.ctx.world.byId(this.r.wormId);
    if (!(worm instanceof Worm)) return;
    const wx = worm.prevX + (worm.x - worm.prevX) * alpha;
    const wy = worm.prevY + (worm.y - worm.prevY) * alpha - 7;
    if (this.r.state === 'shooting') {
      g.moveTo(wx, wy).lineTo(this.r.hookX, this.r.hookY).stroke({ color: 0x3a2a1a, width: 1.5 });
      g.circle(this.r.hookX, this.r.hookY, 2).fill(0x888888);
      return;
    }
    if (this.r.state !== 'attached') return;
    const pts = [...this.r.anchors].reverse();
    g.moveTo(wx, wy);
    for (const p of pts) g.lineTo(p.x, p.y);
    g.stroke({ color: 0x3a2a1a, width: 1.8 });
    const hook = this.r.anchors[0];
    if (hook) g.circle(hook.x, hook.y, 2.2).fill(0x888888).stroke({ color: OUTLINE, width: 0.8 });
  }
}
