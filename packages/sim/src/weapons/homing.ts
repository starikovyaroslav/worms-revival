import type { Hasher } from '../core/hash';
import { Projectile, type ProjectileSpec } from './projectile';
import type { World } from '../world/world';

export interface HomingSpec extends ProjectileSpec {
  /** Ticks of plain ballistic flight before it locks on (W:A: 0.5 s). */
  armTicks: number;
  /** Age in ticks at which the attraction and the target marker end (W:A: 4 s). */
  lockEndTick: number;
  /** Pull towards the target, px/tick². Weak: the missile swings wide and orbits. */
  pull: number;
  /** Speed limit while pulled, px/tick. */
  maxSpeed: number;
}

/**
 * Homing missile, after worms2d.info: launched like a bazooka shell, locks on 0.5 s later and is pulled
 * towards the marker (not steered), so it arcs widely and orbits if it misses. The pull ends after 4 s,
 * it explodes after 10 s, and it only vanishes once it is deep under water.
 */
export class HomingMissile extends Projectile {
  private splashed = false;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    readonly homing: HomingSpec,
    readonly targetX: number | null,
    readonly targetY: number | null,
    ownerId: number,
  ) {
    super(x, y, vx, vy, homing, ownerId);
  }

  get isHoming(): boolean {
    return (
      this.targetX !== null &&
      this.age > this.homing.armTicks &&
      this.age <= this.homing.lockEndTick
    );
  }

  override update(world: World): void {
    if (this.isHoming) {
      const dx = (this.targetX as number) - this.x;
      const dy = (this.targetY as number) - this.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      this.vx += (dx / d) * this.homing.pull;
      this.vy += (dy / d) * this.homing.pull;
      const sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (sp > this.homing.maxSpeed) {
        this.vx *= this.homing.maxSpeed / sp;
        this.vy *= this.homing.maxSpeed / sp;
      }
    }
    super.update(world);
  }

  /** It does not sink: it flies on through the water and is only removed once far below it. */
  protected override onWater(world: World): void {
    if (!this.splashed) {
      this.splashed = true;
      world.emit({ type: 'splash', x: this.x, y: world.waterLevel, size: 0.5 });
    }
    if (this.y > world.waterLevel + 150) this.removed = true;
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.f64(this.targetX ?? -1).f64(this.targetY ?? -1);
  }
}
