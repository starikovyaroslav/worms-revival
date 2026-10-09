import type { Hasher } from '../core/hash';
import { Entity } from '../world/entity';
import type { World } from '../world/world';
import { Worm } from '../worm/worm';
import { explode, type BlastSpec } from './explosion';

const SPEED = 5;
const MAX_TICKS = 45;
const TUNNEL_RADIUS = 6;

/**
 * Kamikaze: the worm itself flies in the chosen direction, boring through the land, and explodes
 * when it reaches a worm or runs out of range.
 */
export class KamikazeFlight extends Entity {
  readonly kind = 'kamikaze';
  private left = MAX_TICKS;

  constructor(
    readonly wormId: number,
    private readonly dirX: number,
    private readonly dirY: number,
    private readonly blast: BlastSpec,
  ) {
    super(0, 0);
  }

  override isBusy(): boolean {
    return true;
  }

  update(world: World): void {
    const worm = world.byId(this.wormId);
    if (!(worm instanceof Worm) || !worm.alive) {
      this.removed = true;
      return;
    }
    // The rope state means "driven by something else": normal physics are off.
    worm.state = 'roped';
    worm.vx = 0;
    worm.vy = 0;
    worm.x += this.dirX * SPEED;
    worm.y += this.dirY * SPEED;
    this.x = worm.cx;
    this.y = worm.cy;
    world.terrain.carveCircle(worm.cx, worm.cy, TUNNEL_RADIUS, true);
    let hit = false;
    for (const w of world.ofKind<Worm>('worm')) {
      if (w === worm || !w.alive) continue;
      const dx = w.cx - worm.cx;
      const dy = w.cy - worm.cy;
      if (dx * dx + dy * dy < 12 * 12) hit = true;
    }
    if (hit || --this.left <= 0 || worm.y > world.waterLevel) {
      this.removed = true;
      explode(world, worm.cx, worm.cy, this.blast);
      if (worm.alive) worm.launch(this.dirX * 2, Math.min(this.dirY * 2, -1), true);
    }
  }

  override hashInto(h: Hasher): void {
    super.hashInto(h);
    h.u32(this.left);
  }
}
