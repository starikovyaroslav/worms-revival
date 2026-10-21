import type { SimFlags } from '../spec';
import type { FireContext } from '../weapon';
import { spawnPayload, type Payload } from './payload';

/** Dropped at the worm's feet with a small toss: dynamite, mine. */
export interface PlacedSim extends SimFlags {
  archetype: 'placed';
  payload: Payload;
  /** Starts this far in front of the worm's feet, px. */
  dx: number;
  /** Toss velocity (horizontal mirrored by facing), px/tick. */
  vx: number;
  vy: number;
  /** The camera follows it. */
  focus?: boolean;
}

export function firePlaced(ctx: FireContext, sim: PlacedSim): void {
  const { worm } = ctx;
  const id = spawnPayload(
    ctx,
    sim.payload,
    worm.x + worm.facing * sim.dx,
    worm.cy,
    worm.facing * sim.vx,
    sim.vy,
  );
  if (sim.focus) ctx.focus(id);
}
