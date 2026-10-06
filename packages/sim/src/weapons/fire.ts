import type { Hasher } from '../core/hash';
import { PhysBody, type Impact } from '../world/body';
import type { World } from '../world/world';
import { Worm } from '../worm/worm';

const BURN_RADIUS = 6;
const BURN_DAMAGE = 2;
/** Ticks between hurting the same worm again. */
const BURN_COOLDOWN = 12;

/** Interface for things that catch fire (oil drums). */
export interface Flammable {
  burn(world: World, amount: number): void;
}

function isFlammable(e: unknown): e is Flammable & PhysBody {
  return typeof (e as Flammable).burn === 'function';
}

/** A blob of burning napalm/petrol. Drifts with the wind, sticks to land and slowly burns it. */
export class Flame extends PhysBody {
  readonly kind = 'flame';
  life: number;
  private cooldown = 0;

  constructor(x: number, y: number, vx: number, vy: number, life: number) {
    super(x, y);
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.radius = 1.5;
    this.windFactor = 1.4;
    this.gravityScale = 0.6;
    this.restitution = 0.1;
    this.friction = 0.5;
    this.blastFactor = 0.6;
  }

  override isBusy(): boolean {
    return true;
  }

  protected override onImpact(world: World, hit: Impact): void {
    this.bounce(hit);
    if (hit.ny < -0.3) this.rest(world);
  }

  override update(world: World): void {
    if (--this.life <= 0) {
      this.removed = true;
      return;
    }
    super.update(world);
    if (this.removed) return;
    // Burning flames eat away at the land underneath.
    if (this.resting && this.life % 20 === 0)
      world.terrain.carveCircle(this.x, this.y + 1, 3, true);
    if (this.cooldown > 0) {
      this.cooldown--;
      return;
    }
    let hit = false;
    for (const w of world.ofKind<Worm>('worm')) {
      if (!w.alive) continue;
      const dx = w.cx - this.x;
      const dy = w.cy - this.y;
      if (dx * dx + dy * dy < (BURN_RADIUS + 4) * (BURN_RADIUS + 4)) {
        w.takeDamage(world, BURN_DAMAGE);
        hit = true;
      }
    }
    for (const e of world.all()) {
      if (e === this || e.removed || !isFlammable(e)) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      if (dx * dx + dy * dy < (BURN_RADIUS + e.radius) * (BURN_RADIUS + e.radius)) {
        e.burn(world, 1);
        hit = true;
      }
    }
    if (hit) this.cooldown = BURN_COOLDOWN;
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.u32(this.life).u32(this.cooldown);
  }
}

/** Sprays `count` flames from a point, mostly upwards. */
export function sprayFlames(
  world: World,
  x: number,
  y: number,
  count: number,
  speed: number,
): void {
  for (let i = 0; i < count; i++) {
    const vx = world.rng.range(-speed, speed);
    const vy = -world.rng.range(speed * 0.4, speed * 1.2);
    world.spawn(new Flame(x, y, vx, vy, world.rng.int(120, 260)));
  }
}
