import { Container } from 'pixi.js';
import type { Barrel } from '@wr/sim';
import { artSprite, place, type EntityView } from './common';

export class BarrelView implements EntityView {
  readonly container = new Container();

  constructor(private readonly b: Barrel) {
    const art = artSprite('objects/barrel');
    if (art) this.container.addChild(art);
  }

  update(alpha: number): void {
    place(this.container, this.b, alpha);
  }
}
