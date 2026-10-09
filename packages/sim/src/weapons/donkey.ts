import type { Hasher } from '../core/hash';
import { Entity } from '../world/entity';
import type { World } from '../world/world';
import { Worm } from '../worm/worm';
import { explode, type BlastSpec } from './explosion';

const FALL_SPEED = 9;
const BORE_RADIUS = 14;

/**
 * Concrete Donkey: drops from the sky onto the marked spot and keeps going: it bores down through
 * all the land, blasting at every new layer, until it reaches the water.
 */
export class Donkey extends Entity {
  readonly kind = 'donkey';
  private lastBlast = -100;

  constructor(
    x: number,
    y: number,
    private readonly blast: BlastSpec,
  ) {
    super(x, y);
    this.vy = FALL_SPEED;
  }

  override isBusy(): boolean {
    return true;
  }

  update(world: World): void {
    for (let i = 0; i < FALL_SPEED && !this.removed; i++) {
      this.y += 1;
      if (this.y > world.waterLevel) {
        world.emit({ type: 'splash', x: this.x, y: world.waterLevel, size: 1.2 });
        this.removed = true;
        return;
      }
      if (world.terrain.circleCollides(this.x, this.y, BORE_RADIUS * 0.6)) {
        world.terrain.carveCircle(this.x, this.y, BORE_RADIUS, true);
        if (this.y - this.lastBlast > 30) {
          this.lastBlast = this.y;
          explode(world, this.x, this.y, this.blast);
        }
      }
      for (const w of world.ofKind<Worm>('worm')) {
        if (!w.alive) continue;
        if (Math.abs(w.cx - this.x) < 10 && Math.abs(w.cy - this.y) < 12) {
          this.lastBlast = this.y;
          explode(world, this.x, this.y, this.blast);
        }
      }
    }
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.f64(this.lastBlast);
  }
}
