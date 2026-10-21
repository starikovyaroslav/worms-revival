import type { SimFlags, ViewSpec } from '../spec';
import type { FireContext } from '../weapon';
import { spawnPayload, type Payload } from './payload';

/**
 * A plane flies over the target in the facing direction and drops `count` payloads: the middle one
 * lands on the target, the rest `spacing` px apart along the flight line. The release point is found
 * by replaying the payload's flight (same gravity, wind and speed clamp as `Body`).
 */
export interface AirRaidSim extends SimFlags {
  archetype: 'airRaid';
  payload: Payload;
  count: number;
  spacing: number;
  /** Plane (and payload) horizontal speed, px/tick. */
  speed: number;
  /** Altitude above the map top at which the plane releases its payload, px. */
  altitude: number;
}

export function fireAirRaid(ctx: FireContext, sim: AirRaidSim, view: ViewSpec): void {
  const { world, worm, target } = ctx;
  if (!target) return;
  const dir = worm.facing;
  const vx = sim.speed * dir;
  const y0 = -sim.altitude;
  const p = world.physics;
  // How the payload flies, so the plane can lead the target correctly.
  const flight =
    sim.payload.kind === 'projectile'
      ? { gravity: sim.payload.projectile.gravity ?? 1, wind: sim.payload.projectile.wind }
      : { gravity: 1, wind: 0 };
  const g = p.gravity * flight.gravity;
  const a = world.wind * p.maxWind * flight.wind;
  let dx = 0;
  let dy = 0;
  let svx = vx;
  let svy = 0;
  for (let n = 0; n < 2000 && y0 + dy < target.y; n++) {
    svy = Math.min(p.maxSpeed, svy + g);
    svx = Math.max(-p.maxSpeed, Math.min(p.maxSpeed, svx + a));
    dx += svx;
    dy += svy;
  }
  const x0 = target.x - dx;
  if (view.sound) world.emit({ type: 'sound', id: view.sound, x: target.x, y: 0 });
  const mid = (sim.count - 1) / 2;
  const focusAt = Math.floor(sim.count / 2);
  const payloadIds: number[] = [];
  for (let i = 0; i < sim.count; i++) {
    const id = spawnPayload(
      ctx,
      sim.payload,
      x0 + (i - mid) * sim.spacing * dir,
      y0 - Math.abs(i - mid) * 4,
      vx,
      0,
    );
    payloadIds.push(id);
    if (i === focusAt) ctx.focus(id);
  }
  world.emit({
    type: 'airRaid',
    x: x0,
    y: y0,
    dir,
    speed: sim.speed,
    spacing: sim.spacing,
    payloadIds,
  });
}
