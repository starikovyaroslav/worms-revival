import { Container } from 'pixi.js';
import type { Pigeon } from '@wr/sim';
import { artSprite, place, type EntityView } from './common';

export class PigeonView implements EntityView {
  readonly container = new Container();

  constructor(private readonly p: Pigeon) {
    const art = artSprite('proj/pigeon');
    if (art) this.container.addChild(art);
  }

  update(alpha: number): void {
    place(this.container, this.p, alpha);
    this.container.scale.set(Math.cos(this.p.heading) < 0 ? -1 : 1, 1);
  }
}
