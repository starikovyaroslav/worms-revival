import { Container, Graphics, Text } from 'pixi.js';
import type { Worm } from '@wr/sim';

interface Bubble {
  worm: Worm;
  box: Container;
  t: number;
}

const LIFETIME = 2.2;

/** Comic speech bubbles that follow worms around. */
export class SpeechView {
  readonly container = new Container();
  private bubbles: Bubble[] = [];

  say(worm: Worm, text: string): void {
    // One bubble per worm at a time.
    for (const b of this.bubbles.filter((b) => b.worm === worm)) b.t = LIFETIME;
    const label = new Text({
      text,
      style: {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: 12,
        fontWeight: 'bold',
        fill: 0x222222,
      },
    });
    label.resolution = 2;
    label.anchor.set(0.5);
    const w = label.width + 12;
    const h = label.height + 8;
    const g = new Graphics()
      .roundRect(-w / 2, -h / 2, w, h, 7)
      .fill(0xe9e6dc)
      .stroke({ color: 0x222222, width: 1.5 })
      .moveTo(-4, h / 2 - 1)
      .lineTo(0, h / 2 + 6)
      .lineTo(4, h / 2 - 1)
      .fill(0xe9e6dc);
    const box = new Container();
    box.addChild(g, label);
    this.container.addChild(box);
    this.bubbles.push({ worm, box, t: 0 });
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (const b of this.bubbles) {
      b.t += dt;
      b.box.position.set(b.worm.x, b.worm.y - 84);
      b.box.alpha = b.t < LIFETIME - 0.3 ? 1 : Math.max(0, (LIFETIME - b.t) / 0.3);
      b.box.scale.set(Math.min(1, b.t * 8));
    }
    for (const b of this.bubbles.filter((b) => b.t >= LIFETIME)) b.box.destroy({ children: true });
    this.bubbles = this.bubbles.filter((b) => b.t < LIFETIME);
  }
}
