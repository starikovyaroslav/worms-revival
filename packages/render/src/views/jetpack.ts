import { Container, Graphics } from 'pixi.js';
import type { JetPack, Worm } from '@wr/sim';
import { OUTLINE, artSprite, type EntityView, type ViewContext } from './common';
import { clipTextures } from '../clipEffects';

export class JetPackView implements EntityView {
  readonly container = new Container();
  private g = new Graphics();
  private t = 0;
  private art = artSprite('objects/jetpack');
  private frames = clipTextures('engine');
  private exhaust = this.frames.length ? artSprite('vfx/engine_0') : artSprite('fx/flame_0', 1);

  constructor(
    private readonly jet: JetPack,
    private readonly ctx: ViewContext,
  ) {
    this.container.addChild(this.g);
    if (this.art) this.container.addChild(this.art);
    if (this.exhaust) {
      this.exhaust.rotation = this.frames.length ? -Math.PI / 2 : Math.PI;
      if (this.frames.length) this.exhaust.anchor.set(1, 0.5);
      this.exhaust.scale.set(this.frames.length ? 0.7 : 0.5);
      this.exhaust.visible = false;
      this.container.addChild(this.exhaust);
    }
  }

  update(alpha: number, dtMs: number): void {
    this.t += dtMs / 1000;
    const w = this.ctx.world.byId(this.jet.wormId) as Worm | undefined;
    const g = this.g.clear();
    this.container.visible = !!w?.alive;
    if (!w || !w.alive) return;
    this.container.position.set(
      w.prevX + (w.x - w.prevX) * alpha,
      w.prevY + (w.y - w.prevY) * alpha,
    );
    const f = -w.facing;
    if (this.art) {
      this.art.position.set(f * 5, -9);
      this.art.scale.x = w.facing;
      if (this.exhaust) {
        if (this.frames.length)
          this.exhaust.texture = this.frames[Math.floor(this.t * 16) % this.frames.length]!;
        this.exhaust.position.set(f * 5, -3);
        this.exhaust.visible = this.jet.thrusting;
      }
      return;
    }
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
