import { cos, sin } from '../core/math';
import type { Hasher } from '../core/hash';
import { Entity } from '../world/entity';
import type { World } from '../world/world';
import { Worm } from '../worm/worm';

/** Distance at which a gas puff poisons a worm. */
const POISON_RADIUS = 10;

/**
 * A puff of poison gas (Skunk). Drifts upwards and with the wind, bounces off land, and poisons any
 * worm it touches: a poisoned worm loses 5 health at the start of its turns but is never killed by it.
 */
export class Gas extends Entity {
  readonly kind = 'gas';
  life: number;

  constructor(x: number, y: number, vx: number, vy: number, life: number) {
    super(x, y);
    this.vx = vx;
    this.vy = vy;
    this.life = life;
  }

  override isBusy(): boolean {
    return true;
  }

  update(world: World): void {
    if (--this.life <= 0) {
      this.removed = true;
      return;
    }
    this.vx =
      this.vx * 0.97 + world.wind * world.physics.maxWind * 0.12 + world.rng.range(-0.04, 0.04);
    this.vy = this.vy * 0.97 - 0.006 + world.rng.range(-0.04, 0.04);
    const nx = this.x + this.vx;
    const ny = this.y + this.vy;
    if (world.terrain.isSolid(nx, ny)) {
      this.vx = -this.vx * 0.5;
      this.vy = -this.vy * 0.5;
    } else {
      this.x = nx;
      this.y = ny;
    }
    if (this.y > world.waterLevel) {
      this.removed = true;
      return;
    }
    for (const w of world.ofKind<Worm>('worm')) {
      if (!w.alive || w.poisoned) continue;
      const dx = w.cx - this.x;
      const dy = w.cy - this.y;
      if (dx * dx + dy * dy < POISON_RADIUS * POISON_RADIUS) {
        w.poisoned = true;
        world.emit({ type: 'sound', id: 'cough', x: w.x, y: w.y });
      }
    }
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.u32(this.life);
  }
}

/** Releases `count` gas puffs from a point. */
export function sprayGas(world: World, x: number, y: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const a = world.rng.range(0, Math.PI * 2);
    const s = world.rng.range(0.3, 1.6);
    world.spawn(new Gas(x, y, cos(a) * s, sin(a) * s - 0.4, world.rng.int(260, 420)));
  }
}
