import type { Hasher } from '../core/hash';
import { cos, sin } from '../core/math';
import { Entity } from '../world/entity';
import type { World } from '../world/world';
import { Worm } from '../worm/worm';
import type { RemoteControlled } from './weapon';

export type DigMode = 'torch' | 'drill';

const SPEC = {
  torch: { ticks: 5 * 50, speed: 0.75, radius: 9, damage: 15 },
  drill: { ticks: 4 * 50, speed: 0.55, radius: 8, damage: 15 },
} as const;
/** The torch can be pointed at most this far up or down, radians. */
const TORCH_MAX_ANGLE = 0.7;

/** Blow torch / pneumatic drill: drives the worm through the land, hurting anyone in the way. */
export class DigTool extends Entity implements RemoteControlled {
  readonly kind = 'digtool';
  ticksLeft: number;
  private dirX: number;
  private dirY: number;
  private hit: number[] = [];

  constructor(
    readonly mode: DigMode,
    readonly wormId: number,
    worm: Worm,
  ) {
    super(worm.x, worm.y);
    this.ticksLeft = SPEC[mode].ticks;
    if (mode === 'drill') {
      this.dirX = 0;
      this.dirY = 1;
    } else {
      const a = Math.max(-TORCH_MAX_ANGLE, Math.min(TORCH_MAX_ANGLE, worm.aim));
      this.dirX = cos(a) * worm.facing;
      this.dirY = -sin(a);
    }
  }

  override isBusy(): boolean {
    return true;
  }

  remoteFire(): void {
    this.ticksLeft = 0;
  }

  timeout(): void {
    this.ticksLeft = 0;
  }

  update(world: World): void {
    const worm = world.byId(this.wormId);
    if (!(worm instanceof Worm) || !worm.alive || this.ticksLeft-- <= 0) {
      this.finish(worm);
      return;
    }
    const spec = SPEC[this.mode];
    const ahead = this.mode === 'drill' ? 3 : 7;
    const cx = worm.cx + this.dirX * ahead;
    const cy = worm.cy + this.dirY * ahead + (this.mode === 'drill' ? 4 : 0);
    world.terrain.carveCircle(cx, cy, spec.radius, true);
    if (this.ticksLeft % 8 === 0) world.emit({ type: 'sound', id: this.mode, x: cx, y: cy });

    // Anyone in the way gets scorched once.
    for (const w of world.ofKind<Worm>('worm')) {
      if (w === worm || !w.alive || this.hit.includes(w.id)) continue;
      const dx = w.cx - cx;
      const dy = w.cy - cy;
      if (dx * dx + dy * dy < (spec.radius + 6) * (spec.radius + 6)) {
        this.hit.push(w.id);
        w.takeDamage(world, spec.damage);
        w.push(this.dirX * 2 + (this.mode === 'drill' ? (w.cx > worm.cx ? 1.5 : -1.5) : 0), -1.5);
      }
    }

    // Advance the worm into the hole, holding it in place against gravity.
    const nx = worm.x + this.dirX * spec.speed;
    const ny = worm.y + this.dirY * spec.speed;
    if (!worm.bodyCollides(world, nx, ny)) {
      worm.x = nx;
      worm.y = ny;
    }
    worm.state = 'idle';
    worm.vx = 0;
    worm.vy = 0;
    this.x = worm.x;
    this.y = worm.y;
  }

  private finish(worm: Entity | undefined): void {
    this.removed = true;
    // Let physics settle the worm wherever it ended up.
    if (worm instanceof Worm && worm.alive) worm.launch(0, 0, false);
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.str(this.mode)
      .u32(this.wormId)
      .u32(this.ticksLeft + 1)
      .f64(this.dirX)
      .f64(this.dirY);
    for (const id of this.hit) h.u32(id);
  }
}
