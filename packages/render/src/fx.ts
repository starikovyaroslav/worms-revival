import { Container, Text } from 'pixi.js';

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

  constructor(_dirtColor: number) {}

  /** Floating text: damage numbers, crate contents. */
  damage(x: number, y: number, amount: number | string, color: number): void {
    const text = new Text({
      text: String(amount),
      style: {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 16,
        fontWeight: '400',
        fill: color,
        stroke: { color: 0x000000, width: 4, join: 'miter' },
      },
    });
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
      p.text.position.set(Math.round(s.x), Math.round(s.y));
      p.text.alpha = p.t < 1.2 ? 1 : Math.max(0, 1 - (p.t - 1.2) / 0.5);
    }
    for (const p of this.popupList.filter((p) => p.t > 1.7)) p.text.destroy();
    this.popupList = this.popupList.filter((p) => p.t <= 1.7);
  }
}
