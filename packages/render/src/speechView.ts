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
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 8,
        fontWeight: '400',
        fill: 0x222222,
      },
    });
    label.anchor.set(0.5);
    const w = Math.round(label.width / 2) * 2 + 16;
    const h = Math.round(label.height / 2) * 2 + 10;
    const g = new Graphics()
      .roundRect(-w / 2, -h / 2, w, h, 4)
      .fill(0xe9e6dc)
      .stroke({ color: 0x222222, width: 2 })
      .moveTo(-4, h / 2 - 1)
      .lineTo(0, h / 2 + 6)
      .lineTo(4, h / 2 - 1)
      .fill(0xe9e6dc);
    const box = new Container();
    box.addChild(g, label);
    this.container.addChild(box);
    this.bubbles.push({ worm, box, t: 0 });
  }

  update(dtMs: number, project: (x: number, y: number) => { x: number; y: number }): void {
    const dt = dtMs / 1000;
    for (const b of this.bubbles) {
      b.t += dt;
      const p = project(b.worm.x, b.worm.y - 30);
      b.box.position.set(Math.round(p.x), Math.round(p.y - 46));
      b.box.alpha = b.t < LIFETIME - 0.3 ? 1 : Math.max(0, (LIFETIME - b.t) / 0.3);
      b.box.scale.set(Math.min(1, b.t * 8));
    }
    for (const b of this.bubbles.filter((b) => b.t >= LIFETIME)) b.box.destroy({ children: true });
    this.bubbles = this.bubbles.filter((b) => b.t < LIFETIME);
  }
}
