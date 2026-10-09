import type { Hasher } from '../core/hash';
import { Entity } from '../world/entity';
import type { World } from '../world/world';
import { Worm } from '../worm/worm';
import { Projectile } from './projectile';
import type { BlastSpec } from './explosion';
import { PhysBody } from '../world/body';

const QUAKE_TICKS = 5 * 50;

/** Earthquake: shakes the whole map, tossing worms and objects about (no damage by itself). */
export class Earthquake extends Entity {
  readonly kind = 'earthquake';
  private left = QUAKE_TICKS;

  constructor() {
    super(0, 0);
  }

  override isBusy(): boolean {
    return true;
  }

  update(world: World): void {
    if (--this.left <= 0) {
      this.removed = true;
      return;
    }
    world.emit({ type: 'shake', amount: 3 });
    if (this.left % 8 !== 0) return;
    for (const e of world.all()) {
      if (e.removed) continue;
      if (e instanceof Worm && e.alive) {
        // A "blasted" hop: bouncy and free of fall damage.
        e.launch(world.rng.range(-1.6, 1.6), -world.rng.range(1.2, 2.6), true);
      } else if (e instanceof PhysBody && e.kind !== 'projectile') {
        e.vy -= world.rng.range(1, 2.2);
        e.vx += world.rng.range(-1, 1);
        e.resting = false;
      }
    }
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.u32(this.left);
  }
}

/** Armageddon: a rain of meteors over the whole map. */
export class MeteorShower extends Entity {
  readonly kind = 'meteors';
  private left: number;

  constructor(
    private readonly blast: BlastSpec,
    private readonly ownerId: number,
    duration = 9 * 50,
  ) {
    super(0, 0);
    this.left = duration;
  }

  override isBusy(): boolean {
    return true;
  }

  update(world: World): void {
    if (--this.left <= 0) {
      this.removed = true;
      return;
    }
    if (this.left % 6 !== 0) return;
    const w = world.terrain.width;
    const x = world.rng.range(-80, w + 80);
    const vx = world.rng.range(-2.5, 2.5);
    world.spawn(
      new Projectile(
        x,
        -40,
        vx,
        world.rng.range(2, 5),
        {
          look: 'meteor',
          radius: 3,
          wind: 0,
          impact: 'explode',
          blast: this.blast,
          flames: { count: 3, speed: 1.6 },
        },
        this.ownerId,
      ),
    );
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.u32(this.left);
  }
}
