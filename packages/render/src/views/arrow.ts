import { Container } from 'pixi.js';
import type { Arrow } from '@wr/sim';
import { artSprite, place, type EntityView } from './common';

export class ArrowView implements EntityView {
  readonly container = new Container();

  constructor(private readonly a: Arrow) {
    const art = artSprite('proj/arrow');
    if (art) this.container.addChild(art);
  }

  update(alpha: number): void {
    place(this.container, this.a, alpha);
    this.container.rotation = Math.atan2(this.a.vy, this.a.vx);
  }
}
