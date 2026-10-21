import { Container, Graphics, type Sprite } from 'pixi.js';
import type { AnimalLook, Sheep } from '@wr/sim';
import { assets } from '../assets';
import { OUTLINE, artSprite, place, type EntityView } from './common';

type WalkerLook = Exclude<AnimalLook, 'sheep'>;

/** Code-drawn bodies for the walkers without pixel art; they face right. */
export const ANIMAL_DRAW: Record<WalkerLook, (g: Graphics, bob: number, t: number) => void> = {
  mole: (g, bob, t) => {
    g.ellipse(0, -1.5 - bob, 5, 3.4)
      .fill(0x6a5040)
      .stroke({ color: OUTLINE, width: 1 });
    g.moveTo(5, -2 - bob)
      .lineTo(8.5, -1 - bob)
      .lineTo(5, 0 - bob)
      .closePath()
      .fill(0xe8a0a0);
    g.circle(3.6, -3 - bob, 0.7).fill(0xffffff);
    g.rect(-1, 1 - bob, 3, 1.5).fill(0xe8c080);
    legs(g, bob, t, 0x3a2a20);
  },
  cow: (g, bob, t) => {
    g.roundRect(-5.5, -5 - bob, 11, 6, 2)
      .fill(0xf8f8f0)
      .stroke({ color: OUTLINE, width: 1 });
    g.rect(-3, -4 - bob, 3, 3).fill(0x2a2a2a);
    g.rect(1, -3 - bob, 2, 2.4).fill(0x2a2a2a);
    g.rect(5, -6 - bob, 4, 4)
      .fill(0xf8f8f0)
      .stroke({ color: OUTLINE, width: 0.8 });
    g.rect(6.4, -7.4 - bob, 1.2, 1.4).fill(0xe8e0b0);
    g.circle(7.6, -4.6 - bob, 0.7).fill(0xd02020);
    legs(g, bob, t, 0x2a2a2a);
  },
  oldwoman: (g, bob, t) => granny(g, bob, t, 0xa05a8a, 0xd8d8d8),
  nun: (g, bob, t) => granny(g, bob, t, 0x2a2a30, 0xf4f4f4),
};

function legs(g: Graphics, bob: number, t: number, color: number): void {
  const step = Math.sin(t * 14) * 1.2;
  g.rect(-3 + step, 2.5 - bob, 1.2, 3).fill(color);
  g.rect(2 - step, 2.5 - bob, 1.2, 3).fill(color);
}

function granny(g: Graphics, bob: number, t: number, dress: number, head: number): void {
  g.roundRect(-3.5, -9 - bob, 7, 10, 2)
    .fill(dress)
    .stroke({ color: OUTLINE, width: 1 });
  g.circle(1, -11 - bob, 2.8)
    .fill(0xf2c8a8)
    .stroke({ color: OUTLINE, width: 0.8 });
  g.rect(-2, -14 - bob, 6, 2.4).fill(head);
  g.rect(4, -5 - bob, 1, 7).fill(0x6a4a2a);
  legs(g, bob, t, 0x3a2a20);
}

/** The Sheep entity and the walkers that reuse it (look decides the body). */
export class SheepView implements EntityView {
  readonly container = new Container();
  private body = new Graphics();
  private t = 0;
  private art: Sprite | null;
  private generated = false;

  constructor(private readonly s: Sheep) {
    const look = s.opts.look ?? 'sheep';
    this.art = artSprite(`creatures/${look}_0`, 0.7) ?? artSprite(`creatures/${look}`, 0.7);
    this.generated = this.art !== null;
    this.art ??= look === 'sheep' ? artSprite('proj/sheep', 0.56) : null;
    if (this.art) this.container.addChild(this.art);
    this.container.addChild(this.body);
  }

  update(alpha: number, dtMs: number): void {
    const s = this.s;
    place(this.container, s, alpha);
    this.t += dtMs / 1000;
    const flying = s.mode === 'fly';
    const bob = flying ? 0 : Math.abs(Math.sin(this.t * 14)) * 1.2;
    if (this.art) {
      if (this.generated) {
        const look = flying ? 'supersheep' : (s.opts.look ?? 'sheep');
        const prefix = `creatures/${look}_`;
        const count = assets.count(prefix);
        const texture = assets.get(
          count ? `${prefix}${Math.floor(this.t * 8) % count}` : `creatures/${look}`,
        );
        if (texture) this.art.texture = texture;
        this.art.anchor.y = flying ? 0.5 : 0.7;
        this.art.y = -Math.round(bob);
        this.container.rotation = flying ? s.heading : 0;
        this.container.scale.set(flying ? 1 : s.dir, 1);
        return;
      }
      // Artwork: it bounces as it trots, and the Super Sheep gets a cape.
      this.art.y = -bob;
      const superTex = assets.get('proj/supersheep');
      if (flying && superTex) this.art.texture = superTex;
      this.container.rotation = flying ? s.heading : 0;
      this.container.scale.set(flying ? 1 : s.dir, 1);
      return;
    }
    const look = s.opts.look ?? 'sheep';
    this.container.scale.set(s.dir, 1);
    const g = this.body.clear();
    if (look === 'sheep')
      g.circle(0, -2 - bob, 4).fill(0xf8f8f0); // art missing from the manifest
    else ANIMAL_DRAW[look](g, bob, this.t);
  }
}
