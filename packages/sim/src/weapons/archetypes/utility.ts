import type { SimFlags, ViewSpec } from '../spec';
import type { FireContext } from '../weapon';

/**
 * Switched on for the rest of the turn, does not use the turn up. In W:A they come from crates and
 * campaign missions; the effect flags live on the worm and clear at the next turn. Each can be used
 * once per turn (the game refuses a second use, so it is not charged twice).
 */
export interface UtilitySim extends SimFlags {
  archetype: 'utility';
  effect: 'lowGravity' | 'fastWalk' | 'laser' | 'invisible' | 'doubleDamage' | 'crateSpy';
}

export function fireUtility(ctx: FireContext, sim: UtilitySim, view: ViewSpec): void {
  switch (sim.effect) {
    case 'lowGravity':
      ctx.worm.lowGravity = true;
      break;
    case 'fastWalk':
      ctx.worm.fastWalk = true;
      break;
    case 'laser':
      ctx.worm.laser = true;
      break;
    case 'invisible':
      ctx.worm.invisible = true;
      break;
    case 'doubleDamage':
      // Everything that goes off before the next turn hurts twice as much (set, never multiplied).
      ctx.world.physics.damageScale = ctx.baseDamageScale * 2;
      break;
    case 'crateSpy':
      ctx.worm.crateSpy = true;
      break;
  }
  if (view.sound) ctx.world.emit({ type: 'sound', id: view.sound, x: ctx.worm.x, y: ctx.worm.y });
}
