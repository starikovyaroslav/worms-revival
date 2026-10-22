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
  /** Bubble height in label px. */
  h: number;
}

const LIFETIME = 2.2;
/** Label px above the worm anchor: top of the name tag, and top of the bouncing turn arrow. */
const TAG_TOP = 38;
const ARROW_TOP = 76;
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
  constructor(private readonly painted = false) {}

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
        fontFamily: this.painted ? 'Arial, sans-serif' : '"Press Start 2P", monospace',
        fontSize: labelFont(this.painted ? 10 : 8, this.ls),
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
    if (this.painted) {
      g.roundRect(x, y, w, h, 4).fill(PAPER).stroke({ color: 0x17252b, width: 1 });
      g.poly([-4, h / 2 - 1, 3, h / 2 + 5, 4, h / 2 - 1])
        .fill(PAPER)
        .stroke({ color: 0x17252b, width: 0.75 });
    } else {
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
    }
    g.scale.set(u);
    const box = new Container();
    box.addChild(g, label);
    this.container.addChild(box);
    this.bubbles.push({ worm, box, t: 0, h });
  }

  /**
   * `arrowWormId`: the worm that carries the turn arrow. Its bubble goes above the arrow, the others
   * above the name tag, so a bubble never covers either.
   */
  update(
    dtMs: number,
    project: (x: number, y: number) => { x: number; y: number },
    arrowWormId: number | null = null,
  ): void {
    const dt = dtMs / 1000;
    const u = labelUnit(this.ls);
    for (const b of this.bubbles) {
      b.t += dt;
      // Same anchor as the worm's tag (see WormView): the tag top is ~38 label px above it, the
      // arrow (with its bounce) reaches ~76. The bubble's tail tip sits 4 px over that.
      const p = project(b.worm.x, b.worm.y - 22);
      const clear = b.worm.id === arrowWormId ? ARROW_TOP : TAG_TOP;
      b.box.position.set(
        snapDevice(p.x, this.ls),
        snapDevice(p.y - (clear + 4 + 8 + b.h / 2) * u, this.ls),
      );
      b.box.alpha = b.t < LIFETIME - 0.3 ? 1 : Math.max(0, (LIFETIME - b.t) / 0.3);
      b.box.scale.set(Math.min(1, b.t * 8));
    }
    for (const b of this.bubbles.filter((b) => b.t >= LIFETIME)) b.box.destroy({ children: true });
    this.bubbles = this.bubbles.filter((b) => b.t < LIFETIME);
  }
}
