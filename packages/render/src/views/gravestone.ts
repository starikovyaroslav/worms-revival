import { Container, type Sprite } from 'pixi.js';
import type { Gravestone } from '@wr/sim';
import { mixColor } from '../color';
import { TEAM_COLORS } from '../wormView';
import { artSprite, place, type EntityView } from './common';
import { assets } from '../assets';

export class GravestoneView implements EntityView {
  readonly container = new Container();
  private age = 0;
  private art: Sprite | null = null;

  constructor(private readonly s: Gravestone) {
    const styles = ['cross', 'round', 'slab', 'skull'];
    const art =
      artSprite(`objects/grave_${styles[s.id % styles.length]}`, 0.8) ??
      artSprite('objects/tombstone', 0.8);
    if (!art) return;
    this.art = art;
    this.art.scale.y *= 0.4;
    // A hint of the team's colour on the whole stone.
    art.tint = mixColor(0xffffff, TEAM_COLORS[s.team % TEAM_COLORS.length] as number, 0.4);
    this.container.addChild(art);
  }

  update(alpha: number, dtMs = 0): void {
    place(this.container, this.s, alpha);
    this.age += dtMs / 1000;
    if (this.art) {
      const u = Math.min(1, this.age / 0.3);
      this.art.scale.y = assets.scaleOf(this.art.texture) * (0.4 + 0.6 * (1 - (1 - u) * (1 - u)));
    }
  }
}
