import type { Hasher } from '../core/hash';
import { PhysBody } from '../world/body';
import type { World } from '../world/world';
import { blastDamage, explode, type Blast } from './explosion';
import { sprayFlames, type Flammable } from './fire';

const BARREL_HEALTH = 50;

/** Oil drum: explodes when damaged enough and spills burning oil. */
export class Barrel extends PhysBody implements Flammable {
  readonly kind = 'barrel';
  health = BARREL_HEALTH;
  private exploding = false;

  constructor(x: number, y: number) {
    super(x, y);
    this.radius = 6;
    this.restitution = 0.2;
    this.friction = 0.6;
    this.blastFactor = 0.5;
  }

  override isBusy(): boolean {
    return !this.resting || this.exploding;
  }

  override onBlast(world: World, b: Blast): void {
    const dx = this.x - b.x;
    const dy = this.y - b.y;
    const dmg = blastDamage(b, Math.sqrt(dx * dx + dy * dy) - this.radius);
    if (dmg <= 0) return;
    super.onBlast(world, b);
    this.hurt(dmg);
  }

  burn(_world: World, amount: number): void {
    this.hurt(amount * 3);
  }

  private hurt(amount: number): void {
    this.health -= amount;
    // Explode on the next tick so chain reactions unfold one after another.
    if (this.health <= 0) this.exploding = true;
  }

  override update(world: World): void {
    if (this.exploding) {
      this.removed = true;
      explode(world, this.x, this.y, { crater: 30, radius: 60, damage: 45 });
      sprayFlames(world, this.x, this.y - 4, 14, 3);
      return;
    }
    super.update(world);
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.f64(this.health).bool(this.exploding);
  }
}
