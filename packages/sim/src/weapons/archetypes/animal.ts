import { muzzle } from '../projectile';
import type { SimFlags, ViewSpec } from '../spec';
import type { FireContext } from '../weapon';
import { makeAnimal, type AnimalParams } from './payload';

/** Releases a walking animal (or several) that blows up: sheep, mole bomb, mad cows... */
export interface AnimalSim extends SimFlags {
  archetype: 'animal';
  animal: AnimalParams;
  /** Appears `dx` px in front of the worm (`step` more for each further animal), `dy` below its centre. */
  spawn: { dx: number; dy?: number; step?: number };
  /** One animal per scheme power star, 1..5 (mad cows). */
  perPowerStar?: boolean;
  /** Shot out of the muzzle like a shell instead of placed (sheep launcher): speed at full power. */
  launch?: { speed: number };
  /** The player steers it (fire and arrows go to it) or the camera merely follows. */
  handover: 'control' | 'focus';
}

export function fireAnimal(ctx: FireContext, sim: AnimalSim, view: ViewSpec): void {
  const { worm, world } = ctx;
  const n = sim.perPowerStar ? Math.min(5, Math.max(1, Math.round(ctx.setting.power))) : 1;
  for (let i = 0; i < n; i++) {
    const at = sim.launch
      ? muzzle(worm, ctx.dirX, ctx.dirY)
      : {
          x: worm.x + worm.facing * (sim.spawn.dx + i * (sim.spawn.step ?? 0)),
          y: worm.cy + (sim.spawn.dy ?? 0),
        };
    const animal = makeAnimal(ctx, sim.animal, at.x, at.y, worm.facing);
    if (sim.launch) {
      // Shot out like a shell; once it lands it trots like any sheep.
      const v = sim.launch.speed * ctx.power;
      animal.vx = ctx.dirX * v;
      animal.vy = ctx.dirY * v;
    }
    if (i === 0 && view.sound)
      world.emit({ type: 'sound', id: view.sound, x: animal.x, y: animal.y });
    if (sim.handover === 'control') ctx.control(animal.id);
    else if (i === 0) ctx.focus(animal.id);
  }
}
