import type { World } from '../world/world';
import { Worm } from '../worm/worm';
import { explode } from './explosion';

export interface HitscanSpec {
  damage: number;
  /** Knockback speed on a worm hit, px/tick. */
  push: number;
  /** Hole made in the land where it hits. */
  crater: number;
  range: number;
}

const HIT_RADIUS = 6;

/** Instant bullet along a ray: hits the first worm or land. Emits a tracer for the renderer. */
export function hitscan(
  world: World,
  shooter: Worm,
  dirX: number,
  dirY: number,
  spec: HitscanSpec,
): void {
  const sx = shooter.cx + dirX * 8;
  const sy = shooter.cy + dirY * 8;
  const worms = world.ofKind<Worm>('worm').filter((w) => w.alive && w !== shooter);
  for (let d = 0; d <= spec.range; d += 1) {
    const x = sx + dirX * d;
    const y = sy + dirY * d;
    for (const w of worms) {
      const dx = w.cx - x;
      const dy = w.cy - y;
      if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) {
        w.takeDamage(world, spec.damage);
        w.push(dirX * spec.push, dirY * spec.push - spec.push * 0.45);
        world.emit({ type: 'tracer', x0: sx, y0: sy, x1: x, y1: y });
        world.emit({ type: 'explosion', x, y, radius: 4 });
        return;
      }
    }
    if (world.terrain.isSolid(x, y)) {
      world.emit({ type: 'tracer', x0: sx, y0: sy, x1: x, y1: y });
      explode(world, x, y, {
        crater: spec.crater,
        radius: spec.crater * 1.7,
        damage: spec.damage * 0.3,
      });
      return;
    }
    if (y > world.waterLevel) {
      world.emit({ type: 'tracer', x0: sx, y0: sy, x1: x, y1: y });
      world.emit({ type: 'splash', x, y: world.waterLevel, size: 0.2 });
      return;
    }
  }
  world.emit({
    type: 'tracer',
    x0: sx,
    y0: sy,
    x1: sx + dirX * spec.range,
    y1: sy + dirY * spec.range,
  });
}
