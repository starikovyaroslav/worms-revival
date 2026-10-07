import type { Hasher } from '../core/hash';
import { Projectile, type ProjectileSpec } from './projectile';
import type { World } from '../world/world';

export interface HomingSpec extends ProjectileSpec {
  /** Ticks of plain ballistic flight before homing starts. */
  armTicks: number;
  /** Ticks of active homing; afterwards it falls like a normal shell. */
  homingTicks: number;
  /** Cruise speed while homing, px/tick. */
  speed: number;
  /** Max turn per tick, radians-ish (applied to the velocity direction). */
  turn: number;
}

/** Homing missile: flies like a bazooka shell, then locks on and steers towards the target. */
export class HomingMissile extends Projectile {
  private homingLeft: number;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    readonly homing: HomingSpec,
    readonly targetX: number,
    readonly targetY: number,
    ownerId: number,
  ) {
    super(x, y, vx, vy, homing, ownerId);
    this.homingLeft = homing.homingTicks;
  }

  get isHoming(): boolean {
    return this.age > this.homing.armTicks && this.homingLeft > 0;
  }

  override update(world: World): void {
    if (this.age > this.homing.armTicks && this.homingLeft > 0) {
      this.homingLeft--;
      // Steer the velocity towards the target, keeping cruise speed; gravity and wind are off.
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
      const k = this.homing.turn;
      let nvx = this.vx / sp + (dx / d) * k;
      let nvy = this.vy / sp + (dy / d) * k;
      const n = Math.sqrt(nvx * nvx + nvy * nvy) || 1;
      const speed = sp + (this.homing.speed - sp) * 0.1;
      nvx = (nvx / n) * speed;
      nvy = (nvy / n) * speed;
      this.vx = nvx;
      this.vy = nvy - world.physics.gravity * this.gravityScale;
      this.windFactor = 0;
    } else if (this.homingLeft <= 0) {
      this.windFactor = this.homing.wind;
    }
    super.update(world);
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.u32(this.homingLeft).f64(this.targetX).f64(this.targetY);
  }
}
