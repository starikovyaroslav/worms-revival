import { Container, Graphics } from 'pixi.js';
import type { Flame, Gas } from '@wr/sim';
import { place, type EntityView } from './common';

export class FlameView implements EntityView {
  readonly container = new Container();
  private g = new Graphics();
  private t = Math.random() * 10;

  constructor(private readonly f: Flame) {
    this.container.addChild(this.g);
  }

  update(alpha: number, dtMs: number): void {
    place(this.container, this.f, alpha);
    this.t += dtMs / 1000;
    const flicker = 0.75 + Math.sin(this.t * 25) * 0.25;
    const fade = Math.min(1, this.f.life / 40);
    const r = 3.5 * flicker * (0.5 + fade * 0.5);
    this.g
      .clear()
      .circle(0, -r * 0.6, r * 1.3)
      .fill({ color: 0xff5a10, alpha: 0.55 * fade })
      .circle(0, -r * 0.5, r)
      .fill({ color: 0xffb030, alpha: 0.9 * fade })
      .circle(0, -r * 0.3, r * 0.5)
      .fill({ color: 0xfff0a0, alpha: fade });
  }
}

export class GasView implements EntityView {
  readonly container = new Container();
  private g = new Graphics();
  private t = Math.random() * 10;

  constructor(private readonly gas: Gas) {
    this.container.addChild(this.g);
  }

  update(alpha: number, dtMs: number): void {
    place(this.container, this.gas, alpha);
    this.t += dtMs / 1000;
    const fade = Math.min(1, this.gas.life / 90);
    const r = 7 + Math.sin(this.t * 2) * 1.5;
    this.g
      .clear()
      .circle(0, 0, r)
      .fill({ color: 0x8aa840, alpha: 0.22 * fade })
      .circle(0, 0, r * 0.6)
      .fill({ color: 0xb4d060, alpha: 0.22 * fade });
  }
}
