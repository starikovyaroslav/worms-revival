import { Container, Graphics } from 'pixi.js';
import type { Flame, Gas } from '@wr/sim';
import { artSprite, place, type EntityView } from './common';
import { assets } from '../assets';
import { clipTextures } from '../clipEffects';
import { fireStyle } from '../fireStyles';
import type { ViewContext } from './common';

export class FlameView implements EntityView {
  readonly container = new Container();
  private g = new Graphics();
  private t = Math.random() * 10;
  private frames = clipTextures('fire');
  private art = this.frames.length ? artSprite('vfx/fire_0', 1) : artSprite('fx/flame_0', 1);
  private style: ReturnType<typeof fireStyle>;

  constructor(
    private readonly f: Flame,
    ctx: ViewContext,
  ) {
    this.style = fireStyle(ctx.world.sourceOf(f));
    this.container.addChild(this.g);
    if (this.art) this.container.addChild(this.art);
  }

  update(alpha: number, dtMs: number): void {
    place(this.container, this.f, alpha);
    this.t += dtMs / 1000;
    const flicker = 0.75 + Math.sin(this.t * 25) * 0.25;
    const fade = Math.min(1, this.f.life / 40);
    const r = 3.5 * flicker * (0.5 + fade * 0.5);
    if (this.art) {
      this.art.texture = this.frames.length
        ? this.frames[Math.floor(this.t * this.style.fps) % this.frames.length]!
        : (assets.get(`fx/flame_${Math.floor(this.t * 10) % 2}`) ?? this.art.texture);
      this.art.tint = this.style.tint;
      this.art.scale.set((this.style.width / this.art.texture.width) * (0.5 + fade * 0.5));
      // Step the life fade like the other pixel effects, rather than blurring the source alpha.
      this.art.alpha = Math.ceil(fade * 4) / 4;
      return;
    }
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
  private frames = clipTextures('gas');
  private art = this.frames.length ? artSprite('vfx/gas_0') : artSprite('creatures/stink');
  private initialLife: number;

  constructor(private readonly gas: Gas) {
    this.initialLife = gas.life;
    if (this.art) this.container.addChild(this.art);
    this.container.addChild(this.g);
  }

  update(alpha: number, dtMs: number): void {
    place(this.container, this.gas, alpha);
    this.t += dtMs / 1000;
    const fade = Math.min(1, this.gas.life / 90);
    if (this.art) {
      if (this.frames.length) {
        const life = 1 - this.gas.life / Math.max(1, this.initialLife);
        this.art.texture =
          this.frames[Math.min(this.frames.length - 1, Math.floor(life * this.frames.length))]!;
        this.art.scale.set(
          (0.65 + 0.15 * Math.sin(this.t * 1.7)) * assets.scaleOf(this.art.texture),
        );
      }
      this.art.alpha = 0.65 * fade;
      return;
    }
    const r = 7 + Math.sin(this.t * 2) * 1.5;
    this.g
      .clear()
      .circle(0, 0, r)
      .fill({ color: 0x8aa840, alpha: 0.22 * fade })
      .circle(0, 0, r * 0.6)
      .fill({ color: 0xb4d060, alpha: 0.22 * fade });
  }
}
