import { Container, Graphics, Text, type Sprite } from 'pixi.js';
import type { Crate } from '@wr/sim';
import { artSprite, place, type EntityView, type ViewContext } from './common';

export class CrateView implements EntityView {
  readonly container = new Container();
  /** Contents label shown while the Crate Spy is active. */
  private spy: Container | null = null;
  private canopy: Sprite | null = null;
  private t = Math.random() * 5;

  constructor(
    private readonly c: Crate,
    private readonly ctx: ViewContext,
  ) {
    const art = artSprite(c.content === 'health' ? 'objects/crate-health' : 'objects/crate-weapon');
    this.canopy = artSprite('objects/parachute', 1);
    if (this.canopy) {
      this.canopy.y = -5;
      this.container.addChild(this.canopy);
    }
    if (art) this.container.addChild(art);
    else this.container.addChild(new Graphics().rect(-7, -7, 14, 14).fill(0x9a6a32)); // art missing
  }

  /** Small label above the crate: weapon icon (or id) or the health amount. */
  private buildSpy(): Container {
    const box = new Container();
    const c = this.c;
    const icon = c.content === 'weapon' ? artSprite(`weapons/icon/${c.weaponId}`, 1) : null;
    if (icon) {
      icon.scale.set(icon.width < 24 ? 1 : 0.6);
      box.addChild(icon);
    } else {
      const text = new Text({
        text: c.content === 'health' ? `+${c.amount}` : c.weaponId,
        style: {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 8,
          fill: c.content === 'health' ? 0x7cff7c : 0xffffff,
          stroke: { color: 0x222034, width: 3, join: 'miter' as const },
        },
      });
      text.anchor.set(0.5, 1);
      box.addChild(text);
    }
    box.y = -12;
    return box;
  }

  update(alpha: number, dtMs: number): void {
    place(this.container, this.c, alpha);
    this.t += dtMs / 1000;
    const spyOn = this.ctx.crateSpy;
    if (spyOn && !this.spy) {
      this.spy = this.buildSpy();
      this.container.addChild(this.spy);
    }
    if (this.spy) {
      this.spy.visible = spyOn;
      this.spy.y = -12 - (this.c.chute ? 20 : 0);
    }
    if (this.canopy) {
      this.canopy.visible = this.c.chute;
      this.canopy.rotation = Math.sin(this.t * 2.5) * 0.06;
    }
  }
}
