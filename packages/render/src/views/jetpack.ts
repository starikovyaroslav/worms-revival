import { Container, Graphics } from 'pixi.js';
import type { JetPack, Worm } from '@wr/sim';
import { OUTLINE, type EntityView, type ViewContext } from './common';

export class JetPackView implements EntityView {
  readonly container = new Container();
  private g = new Graphics();
  private t = 0;

  constructor(
    private readonly jet: JetPack,
    private readonly ctx: ViewContext,
  ) {
    this.container.addChild(this.g);
  }

  update(alpha: number, dtMs: number): void {
    this.t += dtMs / 1000;
    const w = this.ctx.world.byId(this.jet.wormId) as Worm | undefined;
    const g = this.g.clear();
    if (!w || !w.alive) return;
    this.container.position.set(
      w.prevX + (w.x - w.prevX) * alpha,
      w.prevY + (w.y - w.prevY) * alpha,
    );
    const f = -w.facing;
    // The pack on the worm's back.
    g.roundRect(f * 5 - 2.5, -13, 5, 9, 1)
      .fill(0x8a8a96)
      .stroke({ color: OUTLINE, width: 1 });
    g.rect(f * 5 - 1.5, -6, 3, 2).fill(0x555560);
    if (this.jet.thrusting) {
      const fl = 3 + Math.sin(this.t * 60) * 1.5;
      g.moveTo(f * 5 - 2, -4)
        .lineTo(f * 5, -4 + 4 + fl)
        .lineTo(f * 5 + 2, -4)
        .closePath()
        .fill(0xffb030);
    }
  }
}
