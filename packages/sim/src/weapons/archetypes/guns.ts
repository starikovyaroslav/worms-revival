import type { Upgrades } from '../../game/scheme';
import { Gunfire } from '../gunfire';
import { hitscan } from '../hitscan';
import type { SimFlags, ViewSpec } from '../spec';
import { powerScale, type FireContext } from '../weapon';

/** Per-bullet numbers shared by both gun archetypes. */
export interface ShotParams {
  damage: number;
  /** Knockback speed on a worm hit, px/tick. */
  push: number;
  /** Hole made in the land where it hits. */
  crater: number;
  range: number;
}

/** Hold-to-fire volley that the player keeps aiming meanwhile (handgun, uzi, minigun). */
export interface BurstSim extends SimFlags, ShotParams {
  archetype: 'burst';
  bullets: number;
  /** Ticks between bullets. */
  interval: number;
  /** Random spread per bullet, radians. */
  spread: number;
}

/** Instant shots along the aim line, all at once (shotgun). */
export interface HitscanSim extends SimFlags, ShotParams {
  archetype: 'hitscan';
  /** A second barrel fires too when the scheme enables this upgrade. */
  secondBarrel?: keyof Upgrades;
}

export function fireBurst(ctx: FireContext, sim: BurstSim, view: ViewSpec): void {
  if (!view.sound) throw new Error('burst weapons need view.sound');
  const g = ctx.world.spawn(
    new Gunfire(ctx.worm.id, ctx.worm, {
      bullets: sim.bullets,
      interval: sim.interval,
      spread: sim.spread,
      damage: sim.damage * powerScale(ctx.setting.power),
      push: sim.push,
      crater: sim.crater,
      range: sim.range,
      sound: view.sound,
    }),
  );
  ctx.control(g.id);
}

export function fireHitscan(ctx: FireContext, sim: HitscanSim, view: ViewSpec): void {
  if (view.sound) ctx.world.emit({ type: 'sound', id: view.sound, x: ctx.worm.x, y: ctx.worm.y });
  const pellet = () =>
    hitscan(ctx.world, ctx.worm, ctx.dirX, ctx.dirY, {
      damage: sim.damage * powerScale(ctx.setting.power),
      push: sim.push,
      crater: sim.crater,
      range: sim.range,
    });
  pellet();
  if (sim.secondBarrel && ctx.upgrades[sim.secondBarrel]) pellet();
}
