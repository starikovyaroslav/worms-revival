import { Container } from 'pixi.js';
import type { Gravestone } from '@wr/sim';
import { mixColor } from '../color';
import { TEAM_COLORS } from '../wormView';
import { artSprite, place, type EntityView } from './common';

export class GravestoneView implements EntityView {
  readonly container = new Container();

  constructor(private readonly s: Gravestone) {
    const styles = ['cross', 'round', 'slab', 'skull'];
    const art =
      artSprite(`objects/grave_${styles[s.id % styles.length]}`, 0.8) ??
      artSprite('objects/tombstone', 0.8);
    if (!art) return;
    // A hint of the team's colour on the whole stone.
    art.tint = mixColor(0xffffff, TEAM_COLORS[s.team % TEAM_COLORS.length] as number, 0.4);
    this.container.addChild(art);
  }

  update(alpha: number): void {
    place(this.container, this.s, alpha);
  }
}
