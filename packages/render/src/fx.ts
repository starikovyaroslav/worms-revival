import { Container, Text } from 'pixi.js';

interface Popup {
  text: Text;
  t: number;
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
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: 16,
        fontWeight: 'bold',
        fill: color,
        stroke: { color: 0x000000, width: 3, join: 'round' },
      },
    });
    text.resolution = 2;
    text.anchor.set(0.5);
    text.position.set(x, y);
    this.container.addChild(text);
    this.popupList.push({ text, t: 0 });
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (const p of this.popupList) {
      p.t += dt;
      p.text.y -= dt * 25;
      p.text.alpha = p.t < 1.2 ? 1 : Math.max(0, 1 - (p.t - 1.2) / 0.5);
    }
    for (const p of this.popupList.filter((p) => p.t > 1.7)) p.text.destroy();
    this.popupList = this.popupList.filter((p) => p.t <= 1.7);
  }
}
