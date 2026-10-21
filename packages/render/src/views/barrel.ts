import { Container, type Sprite } from 'pixi.js';
import { assets } from '../assets';
import type { Barrel } from '@wr/sim';
import { artSprite, place, type EntityView, type ViewContext } from './common';

export class BarrelView implements EntityView {
  readonly container = new Container();
  private art: Sprite | null;

  constructor(
    private readonly b: Barrel,
    private readonly ctx: ViewContext,
  ) {
    this.art = artSprite('objects/barrel');
    if (this.art) this.container.addChild(this.art);
  }

  update(alpha: number): void {
    place(this.container, this.b, alpha);
    if (this.art) {
      const burning = this.ctx.world
        .ofKind('flame')
        .some((f) => (f.x - this.b.x) ** 2 + (f.y - this.b.y) ** 2 < 144);
      const texture = assets.get(burning ? 'objects/barrel_burning' : 'objects/barrel');
      if (texture) this.art.texture = texture;
    }
  }
}
