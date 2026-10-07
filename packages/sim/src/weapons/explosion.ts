import type { World } from '../world/world';

export interface BlastSpec {
  /** Radius of the hole carved in the land, px. */
  crater: number;
  /** Radius within which entities are hurt and pushed, px. */
  radius: number;
  /** Damage at the centre. */
  damage: number;
  /** Knockback multiplier: 1 = standard. */
  push?: number;
  /** Explosions without a crater (e.g. fire punch hits) leave the land alone. */
  noCrater?: boolean;
}

export interface Blast extends Required<BlastSpec> {
  x: number;
  y: number;
}

/** Knockback speed per point of damage, px/tick. */
const PUSH_PER_DAMAGE = 0.12;
/** Extra upward lift so blasted worms arc through the air as in W:A. */
const LIFT = 0.45;

/**
 * Damage at distance `d` from the centre: linear falloff to zero at the edge of the radius.
 * `d` should already account for the size of the target.
 */
export function blastDamage(b: Pick<Blast, 'damage' | 'radius'>, d: number): number {
  if (d >= b.radius) return 0;
  return b.damage * (1 - Math.max(0, d) / b.radius);
}

/**
 * Knockback velocity for a target at (tx, ty) that took `dmg` damage. Pushes away from the
 * centre with an upward bias.
 */
export function blastImpulse(
  b: Blast,
  tx: number,
  ty: number,
  dmg: number,
): { x: number; y: number } {
  let dx = tx - b.x;
  let dy = ty - b.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-6) {
    dx = 0;
    dy = -1;
  } else {
    dx /= len;
    dy /= len;
  }
  dy -= LIFT;
  const n = Math.sqrt(dx * dx + dy * dy);
  const speed = dmg * PUSH_PER_DAMAGE * b.push;
  return { x: (dx / n) * speed, y: (dy / n) * speed };
}

/** Carves the crater, notifies every entity and emits presentation events. */
export function explode(world: World, x: number, y: number, spec: BlastSpec): Blast {
  const blast: Blast = { push: 1, noCrater: false, ...spec, x, y };
  blast.damage *= world.physics.damageScale;
  if (!blast.noCrater && blast.crater > 0) world.terrain.carveCircle(x, y, blast.crater);
  for (const e of world.all()) {
    if (!e.removed) e.onBlast(world, blast);
  }
  world.emit({ type: 'explosion', x, y, radius: Math.max(blast.crater, blast.radius * 0.6) });
  return blast;
}
