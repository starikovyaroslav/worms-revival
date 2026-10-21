import { Container, Graphics } from 'pixi.js';
import type { Donkey } from '@wr/sim';
import { OUTLINE, place, type EntityView } from './common';

export class DonkeyView implements EntityView {
  readonly container = new Container();

  constructor(private readonly d: Donkey) {
    const g = new Graphics();
    g.roundRect(-11, -9, 22, 13, 3).fill(0x9a9aa4).stroke({ color: OUTLINE, width: 1.2 });
    g.rect(8, -15, 8, 9).fill(0x9a9aa4).stroke({ color: OUTLINE, width: 1 });
    g.rect(10, -21, 2.4, 7).fill(0x9a9aa4);
    g.rect(14, -21, 2.4, 7).fill(0x9a9aa4);
    g.circle(14, -11, 1).fill(0x111111);
    g.rect(-9, 4, 3, 8).fill(0x8a8a94);
    g.rect(5, 4, 3, 8).fill(0x8a8a94);
    this.container.addChild(g);
  }

  update(alpha: number): void {
    place(this.container, this.d, alpha);
  }
}
