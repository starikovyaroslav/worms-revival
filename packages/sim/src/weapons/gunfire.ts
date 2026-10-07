import type { Hasher } from '../core/hash';
import { HALF_PI, cos, sin } from '../core/math';
import { Entity } from '../world/entity';
import type { World } from '../world/world';
import { Worm } from '../worm/worm';
import { hitscan, type HitscanSpec } from './hitscan';
import type { RemoteControlled } from './weapon';

export interface BurstSpec extends HitscanSpec {
  bullets: number;
  /** Ticks between bullets. */
  interval: number;
  /** Random spread per bullet, radians. */
  spread: number;
  sound: string;
}

/** Aim adjustment per tick while firing, radians. */
const AIM_RATE = HALF_PI / 38;

/** A burst of bullets (uzi, minigun, handgun). The player can sweep the aim while it fires. */
export class Gunfire extends Entity implements RemoteControlled {
  readonly kind = 'gunfire';
  left: number;
  private timer = 0;
  private up = false;
  private down = false;

  constructor(
    readonly wormId: number,
    worm: Worm,
    readonly spec: BurstSpec,
  ) {
    super(worm.cx, worm.cy);
    this.left = spec.bullets;
  }

  override isBusy(): boolean {
    return true;
  }

  remoteFire(): void {}

  steer(_l: boolean, _r: boolean, up: boolean, down: boolean): void {
    this.up = up;
    this.down = down;
  }

  timeout(): void {
    this.removed = true;
  }

  update(world: World): void {
    const worm = world.byId(this.wormId);
    if (!(worm instanceof Worm) || !worm.alive || this.left <= 0) {
      this.removed = true;
      return;
    }
    if (this.up) worm.aim = Math.min(HALF_PI, worm.aim + AIM_RATE);
    if (this.down) worm.aim = Math.max(-HALF_PI, worm.aim - AIM_RATE);
    if (this.timer-- > 0) return;
    this.timer = this.spec.interval - 1;
    this.left--;
    const a = worm.aim + world.rng.range(-this.spec.spread, this.spec.spread);
    world.emit({ type: 'sound', id: this.spec.sound, x: worm.x, y: worm.y });
    hitscan(world, worm, cos(a) * worm.facing, -sin(a), this.spec);
    this.x = worm.cx;
    this.y = worm.cy;
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.u32(this.left)
      .u32(this.timer + 1)
      .bool(this.up)
      .bool(this.down);
  }
}
