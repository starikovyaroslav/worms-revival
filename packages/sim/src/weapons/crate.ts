import type { Hasher } from '../core/hash';
import { PhysBody, type Impact } from '../world/body';
import type { World } from '../world/world';
import { Worm } from '../worm/worm';
import { blastDamage, explode, type Blast } from './explosion';

export type CrateKind = 'weapon' | 'health';

const PICKUP_RADIUS = 13;
/** Sink speed under the parachute, px/tick. */
const CHUTE_FALL = 1.3;

/** Supply crate. Drops by parachute, picked up by touching it, explodes when blasted. */
export class Crate extends PhysBody {
  readonly kind = 'crate';
  /** Parachute still open (until it first lands). */
  chute = true;
  /** Worm that picked it up this tick; the game applies the contents. */
  collectorId = 0;
  private exploding = false;

  constructor(
    x: number,
    y: number,
    readonly content: CrateKind,
    /** Weapon id for weapon crates, health amount as a string-free number for health crates. */
    readonly weaponId: string,
    readonly amount: number,
  ) {
    super(x, y);
    this.radius = 6;
    this.restitution = 0.15;
    this.friction = 0.5;
    this.windFactor = 1;
    this.blastFactor = 0.6;
  }

  override isBusy(): boolean {
    return !this.resting || this.exploding;
  }

  override onBlast(world: World, b: Blast): void {
    const d = Math.sqrt((this.x - b.x) ** 2 + (this.y - b.y) ** 2) - this.radius;
    if (blastDamage(b, d) > 5) this.exploding = true;
    else super.onBlast(world, b);
  }

  protected override onImpact(world: World, hit: Impact): void {
    this.chute = false;
    this.windFactor = 0;
    super.onImpact(world, hit);
  }

  override update(world: World): void {
    if (this.exploding) {
      this.removed = true;
      explode(world, this.x, this.y, { crater: 25, radius: 45, damage: 30 });
      return;
    }
    // Under the parachute gravity is cancelled out by drag: sink at a steady speed.
    this.gravityScale = this.chute ? 0 : 1;
    if (this.chute) this.vy = CHUTE_FALL;
    super.update(world);
    if (this.removed || this.collectorId) return;
    for (const w of world.ofKind<Worm>('worm')) {
      if (!w.alive) continue;
      const dx = w.cx - this.x;
      const dy = w.cy - this.y;
      if (dx * dx + dy * dy < PICKUP_RADIUS * PICKUP_RADIUS) {
        this.collectorId = w.id;
        break;
      }
    }
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.str(this.content)
      .str(this.weaponId)
      .f64(this.amount)
      .bool(this.chute)
      .u32(this.collectorId)
      .bool(this.exploding);
  }
}
