import type { World } from '../../world/world';
import type { Worm } from '../../worm/worm';
import type { SimFlags, ViewSpec } from '../spec';
import { powerScale, type FireContext } from '../weapon';

/** Living worms (other than `except`) whose body centre is within `r` of a point. */
export function wormsNear(world: World, x: number, y: number, r: number, except?: Worm): Worm[] {
  return world.ofKind<Worm>('worm').filter((w) => {
    if (!w.alive || w === except) return false;
    const dx = w.cx - x;
    const dy = w.cy - y;
    return dx * dx + dy * dy <= r * r;
  });
}

/** Hits the worms just in front of the attacker and knocks them back (fire punch, bat, prod). */
export interface MeleeSim extends SimFlags {
  archetype: 'melee';
  /** Hit radius; the hit point is 60% of it in front of the body, px. */
  reach: number;
  damage: number;
  /** Knockback: a fixed vector mirrored by facing, or along the aim (never steeper down than maxDy). */
  push: { mode: 'facing'; x: number; y: number } | { mode: 'aim'; speed: number; maxDy: number };
  /** The uppercut cuts a channel through the land above the worm: `count` holes, `step` px apart. */
  carve?: { count: number; offsetY: number; step: number; radius: number };
  /** The attacker is thrown too. */
  selfLaunch?: { vx: number; vy: number };
}

export function fireMelee(ctx: FireContext, sim: MeleeSim, view: ViewSpec): void {
  const { world, worm } = ctx;
  if (sim.carve) {
    const c = sim.carve;
    for (let i = 0; i < c.count; i++)
      world.terrain.carveCircle(worm.x, worm.y - c.offsetY - i * c.step, c.radius, false);
  }
  let vx: number;
  let vy: number;
  if (sim.push.mode === 'facing') {
    vx = worm.facing * sim.push.x;
    vy = sim.push.y;
  } else {
    // Along the aim, always at least a little upwards.
    const dy = Math.min(ctx.dirY, sim.push.maxDy);
    vx = ctx.dirX * sim.push.speed;
    vy = dy * sim.push.speed;
  }
  const hx = worm.cx + ctx.dirX * sim.reach * 0.6;
  const hy = worm.cy + ctx.dirY * sim.reach * 0.6;
  const victims = wormsNear(world, hx, hy, sim.reach, worm);
  for (const v of victims) {
    v.takeDamage(world, sim.damage * powerScale(ctx.setting.power));
    v.push(vx, vy);
  }
  const sound = victims.length ? view.sound : view.missSound;
  if (sound) world.emit({ type: 'sound', id: sound, x: hx, y: hy });
  if (sim.selfLaunch) worm.launch(sim.selfLaunch.vx, sim.selfLaunch.vy, false);
}
