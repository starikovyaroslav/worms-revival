import { Container, Text } from 'pixi.js';
import {
  DEFAULT_LABEL_SCALE,
  labelFont,
  labelUnit,
  snapDevice,
  type LabelScale,
} from './labelScale';

interface Popup {
  text: Text;
  t: number;
  /** World position; converted to the screen each frame. */
  x: number;
  y: number;
  /** Font base size (16, or 24 for heavy hits). */
  base: number;
}

const POP = 0.3;

/** Floating text above the action: damage numbers, crate contents. */
export class Fx {
  readonly container = new Container();
  private popupList: Popup[] = [];
  private ls: LabelScale = DEFAULT_LABEL_SCALE;

  constructor(_dirtColor: number) {}

  /** New label size (viewport change); texts on screen are restyled too. */
  setLabelScale(ls: LabelScale): void {
    this.ls = ls;
    for (const p of this.popupList) this.style(p.text, p.base);
  }

  private style(text: Text, base: number): void {
    text.style.fontSize = labelFont(base, this.ls);
    // DB32 ink outline.
    text.style.stroke = { color: 0x222034, width: 4 * labelUnit(this.ls), join: 'miter' };
  }

  POP = 0.3;

  /** Floating text: damage numbers, crate contents. */
  damage(x: number, y: number, amount: number | string, color: number): void {
    const text = new Text({
      text: String(amount),
      style: {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 16,
        fontWeight: '400',
        fill: color,
      },
    });
    // Heavy hits are drawn one step larger.
    const base = typeof amount === 'number' && amount >= 30 ? 24 : 16;
    this.style(text, base);
    text.anchor.set(0.5);
    this.container.addChild(text);
    this.popupList.push({ text, t: 0, x, y, base });
  }

  update(dtMs: number, project: (x: number, y: number) => { x: number; y: number }): void {
    const dt = dtMs / 1000;
    for (const p of this.popupList) {
      p.t += dt;
      // A short hop on appearing (whole-pixel steps), then a slow float upwards.
      if (p.t > POP) p.y -= dt * 22;
      const hop = p.t < POP ? -Math.round(Math.sin((p.t / POP) * Math.PI) * 9) : 0;
      const s = project(p.x, p.y + hop);
      p.text.position.set(snapDevice(s.x, this.ls), snapDevice(s.y, this.ls));
      p.text.alpha = p.t < 1.2 ? 1 : Math.max(0, 1 - (p.t - 1.2) / 0.5);
    }
    for (const p of this.popupList.filter((p) => p.t > 1.7)) p.text.destroy();
    this.popupList = this.popupList.filter((p) => p.t <= 1.7);
  }
}
