import { segmentDist2 } from '../core/math';
import { Material } from '../terrain/terrain';
import { PhysBody, type Impact } from '../world/body';
import type { World } from '../world/world';
import { Worm } from '../worm/worm';

const HIT_RADIUS = 7;

const SAFE_TICKS = 5;

/** Longbow arrow: hurts a worm it hits, otherwise sticks into the land as a tiny ledge. */
export class Arrow extends PhysBody {
  readonly kind = 'arrow';
  age = 0;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    readonly damage: number,
    readonly ownerId: number,
  ) {
    super(x, y);
    this.vx = vx;
    this.vy = vy;
    this.radius = 1;
    this.gravityScale = 0.5;
    this.windFactor = 0;
  }

  override isBusy(): boolean {
    return true;
  }

  override update(world: World): void {
    this.age++;
    super.update(world);
    if (this.removed) return;
    for (const w of world.ofKind<Worm>('worm')) {
      if (!w.alive || (w.id === this.ownerId && this.age < SAFE_TICKS)) continue;
      if (
        segmentDist2(this.prevX, this.prevY, this.x, this.y, w.cx, w.cy) <
        HIT_RADIUS * HIT_RADIUS
      ) {
        w.takeDamage(world, this.damage);
        w.push(this.vx * 0.35, this.vy * 0.35 - 1);
        world.emit({ type: 'sound', id: 'punch', x: this.x, y: this.y });
        this.removed = true;
        return;
      }
    }
  }

  protected override onImpact(world: World, _hit: Impact): void {
    // Embed: a short shaft pointing back along the flight path, sticking out of the land.
    const sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
    const ax = this.vx / sp;
    const ay = this.vy / sp;
    world.terrain.fillRotatedRect(this.x - ax * 5, this.y - ay * 5, 6, 1, ax, ay, Material.Girder);
    world.emit({ type: 'sound', id: 'rope-attach', x: this.x, y: this.y });
    this.removed = true;
  }
}
