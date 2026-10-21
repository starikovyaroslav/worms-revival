import { Container, Graphics, type Sprite } from 'pixi.js';
import { assets } from '../assets';
import type { Mine } from '@wr/sim';
import { artSprite, place, type EntityView } from './common';

export class MineView implements EntityView {
  readonly container = new Container();
  private light = new Graphics();
  private t = 0;
  private art: Sprite | null;

  constructor(private readonly m: Mine) {
    this.art = artSprite('objects/mine_off', 0.7) ?? artSprite('objects/mine', 0.7);
    if (this.art) this.container.addChild(this.art);
    this.container.addChild(this.light);
  }

  update(alpha: number, dtMs: number): void {
    place(this.container, this.m, alpha);
    this.t += dtMs / 1000;
    const m = this.m;
    // Slow blink when armed, frantic when triggered, nothing for a fizzled dud.
    const rate = m.triggered ? 10 : 1.5;
    const on = m.armed && Math.sin(this.t * rate * Math.PI) > 0;
    this.light.clear();
    const texture = assets.get(`objects/mine_${on ? 'armed' : 'off'}`);
    if (texture && this.art) {
      this.art.texture = texture;
      return;
    }
    if (on) this.light.circle(0, -0.5, 1.4).fill(0xff2020);
    else if (m.spent) this.light.circle(0, -0.5, 1.2).fill(0x444444);
  }
}
