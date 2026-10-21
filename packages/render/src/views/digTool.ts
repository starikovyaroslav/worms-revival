import { Container, Graphics } from 'pixi.js';
import type { DigTool } from '@wr/sim';
import { place, type EntityView } from './common';

export class DigToolView implements EntityView {
  readonly container = new Container();
  private g = new Graphics();

  constructor(private readonly d: DigTool) {
    this.container.addChild(this.g);
  }

  update(alpha: number): void {
    place(this.container, this.d, alpha);
    const g = this.g.clear();
    // A burst of sparks at the business end.
    const torch = this.d.mode === 'torch';
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 6;
      g.circle(Math.cos(a) * r, Math.sin(a) * r + (torch ? -7 : 2), 1 + Math.random()).fill(
        torch ? 0xffa030 : 0xd8c8a0,
      );
    }
  }
}
