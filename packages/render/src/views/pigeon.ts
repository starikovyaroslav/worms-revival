import { Container, type Sprite } from 'pixi.js';
import { assets } from '../assets';
import type { Pigeon } from '@wr/sim';
import { artSprite, place, type EntityView } from './common';

export class PigeonView implements EntityView {
  readonly container = new Container();
  private art: Sprite | null;
  private t = 0;

  constructor(private readonly p: Pigeon) {
    this.art = artSprite('creatures/pigeon_0') ?? artSprite('proj/pigeon');
    if (this.art) this.container.addChild(this.art);
  }

  update(alpha: number, dtMs = 0): void {
    place(this.container, this.p, alpha);
    this.t += dtMs;
    const texture = assets.get(`creatures/pigeon_${Math.floor(this.t / 120) % 2}`);
    if (texture && this.art) this.art.texture = texture;
    this.container.scale.set(Math.cos(this.p.heading) < 0 ? -1 : 1, 1);
  }
}
