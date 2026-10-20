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
}

/** Floating text above the action: damage numbers, crate contents. */
export class Fx {
  readonly container = new Container();
  private popupList: Popup[] = [];
  private ls: LabelScale = DEFAULT_LABEL_SCALE;

  constructor(_dirtColor: number) {}

  /** New label size (viewport change); texts on screen are restyled too. */
  setLabelScale(ls: LabelScale): void {
    this.ls = ls;
    for (const p of this.popupList) this.style(p.text);
  }

  private style(text: Text): void {
    text.style.fontSize = labelFont(16, this.ls);
    text.style.stroke = { color: 0x000000, width: 4 * labelUnit(this.ls), join: 'miter' };
  }

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
    this.style(text);
    text.anchor.set(0.5);
    this.container.addChild(text);
    this.popupList.push({ text, t: 0, x, y });
  }

  update(dtMs: number, project: (x: number, y: number) => { x: number; y: number }): void {
    const dt = dtMs / 1000;
    for (const p of this.popupList) {
      p.t += dt;
      p.y -= dt * 22;
      const s = project(p.x, p.y);
      p.text.position.set(snapDevice(s.x, this.ls), snapDevice(s.y, this.ls));
      p.text.alpha = p.t < 1.2 ? 1 : Math.max(0, 1 - (p.t - 1.2) / 0.5);
    }
    for (const p of this.popupList.filter((p) => p.t > 1.7)) p.text.destroy();
    this.popupList = this.popupList.filter((p) => p.t <= 1.7);
  }
}
