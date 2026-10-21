import { Container, Graphics, Text } from 'pixi.js';
import type { Worm } from '@wr/sim';
import {
  DEFAULT_LABEL_SCALE,
  labelFont,
  labelUnit,
  snapDevice,
  type LabelScale,
} from './labelScale';

interface Bubble {
  worm: Worm;
  box: Container;
  t: number;
}

const LIFETIME = 2.2;
/** HUD palette (see style.css) and the bubble's paper. */
const INK = 0x222034;
const PAPER = 0xe9e6dc;
const PAPER_HI = 0xffffff;
const PAPER_LO = 0xb4b0a4;

/** Comic speech bubbles that follow worms around. */
export class SpeechView {
  readonly container = new Container();
  private bubbles: Bubble[] = [];
  private ls: LabelScale = DEFAULT_LABEL_SCALE;

  /** New label size; applies to bubbles created from now on (they only live ~2 s). */
  setLabelScale(ls: LabelScale): void {
    this.ls = ls;
  }

  say(worm: Worm, text: string): void {
    // One bubble per worm at a time.
    for (const b of this.bubbles.filter((b) => b.worm === worm)) b.t = LIFETIME;
    const u = labelUnit(this.ls);
    const label = new Text({
      text,
      style: {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: labelFont(8, this.ls),
        fontWeight: '400',
        fill: INK,
      },
    });
    label.anchor.set(0.5);
    // The bubble is drawn in label pixels and scaled; the text keeps its own crisp size.
    const w = Math.round(label.width / u / 2) * 2 + 16;
    const h = Math.round(label.height / u / 2) * 2 + 10;
    // The same pixel panel as the HUD: 2 px ink outline, light top/left and dark bottom/right bevel,
    // square corners; the tail is a three-step pixel wedge.
    const g = new Graphics();
    const x = -w / 2;
    const y = -h / 2;
    g.rect(x - 2, y - 2, w + 4, h + 4).fill(INK);
    g.rect(x, y, w, h).fill(PAPER);
    g.rect(x, y, w, 2).fill(PAPER_HI);
    g.rect(x, y, 2, h).fill(PAPER_HI);
    g.rect(x, y + h - 2, w, 2).fill(PAPER_LO);
    g.rect(x + w - 2, y, 2, h).fill(PAPER_LO);
    for (let i = 0; i < 3; i++) {
      const inkW = (2 - i) * 4 + 4;
      g.rect(-inkW / 2, h / 2 + i * 2, inkW, 2).fill(INK);
      if (inkW > 4) g.rect(-(inkW - 4) / 2, h / 2 + i * 2, inkW - 4, 2).fill(PAPER);
    }
    g.scale.set(u);
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
      b.box.position.set(
        snapDevice(p.x, this.ls),
        snapDevice(p.y - 46 * labelUnit(this.ls), this.ls),
      );
      b.box.alpha = b.t < LIFETIME - 0.3 ? 1 : Math.max(0, (LIFETIME - b.t) / 0.3);
      b.box.scale.set(Math.min(1, b.t * 8));
    }
    for (const b of this.bubbles.filter((b) => b.t >= LIFETIME)) b.box.destroy({ children: true });
    this.bubbles = this.bubbles.filter((b) => b.t < LIFETIME);
  }
}
