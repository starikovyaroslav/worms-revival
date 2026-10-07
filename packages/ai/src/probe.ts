import { Barrel, World, Worm, cos, sin, type Game, type WeaponDef } from '@wr/sim';

export interface ShotParams {
  weapon: WeaponDef;
  facing: 1 | -1;
  aim: number;
  power: number;
  fuseSeconds: number;
  bounceHigh: boolean;
  target: { x: number; y: number } | null;
}

export interface ShotOutcome {
  /** Health lost per worm id (drowning counts as all remaining health). */
  damage: Map<number, number>;
  killed: Set<number>;
}

/** Ticks a probe may run before we stop watching. */
const PROBE_TICKS = 420;

/**
 * Plays a shot out in a throwaway copy of the world (own copy of the land, copies of worms and
 * oil drums) and reports what it did to every worm.
 */
export function probeShot(game: Game, shooterId: number, shot: ShotParams): ShotOutcome {
  const src = game.world;
  const world = new World({
    seed: src.tick + 1,
    terrain: src.terrain.clone(),
    waterLevel: src.waterLevel,
    physics: src.physics,
  });
  world.wind = src.wind;
  const copies = new Map<number, Worm>();
  let shooter: Worm | null = null;
  for (const e of src.all()) {
    if (e instanceof Worm && e.alive) {
      const w = world.spawn(new Worm(e.x, e.y, e.name, e.team, e.health));
      w.state = e.state === 'roped' ? 'idle' : e.state;
      w.facing = e.facing;
      w.vx = e.vx;
      w.vy = e.vy;
      copies.set(e.id, w);
      if (e.id === shooterId) shooter = w;
    } else if (e instanceof Barrel) {
      const b = world.spawn(new Barrel(e.x, e.y));
      b.health = e.health;
      b.resting = e.resting;
    }
  }
  const result: ShotOutcome = { damage: new Map(), killed: new Set() };
  if (!shooter) return result;
  world.step();
  const s = shooter as Worm;
  s.facing = shot.facing;
  s.aim = shot.aim;
  const def = shot.weapon;
  const dirX = def.aim === 'none' ? shot.facing : cos(shot.aim) * shot.facing;
  const dirY = def.aim === 'none' ? 0 : -sin(shot.aim);
  def.fire({
    world,
    worm: s,
    dirX,
    dirY,
    power: shot.power,
    fuse: shot.fuseSeconds * 50,
    bounceHigh: shot.bounceHigh,
    target: shot.target,
    setting: game.scheme.weapons[def.id] ?? { ammo: 1, power: 3, delay: 0, crate: 0 },
    upgrades: game.scheme.upgrades,
    focus: () => {},
    control: () => {},
  });
  // Shotgun: assume both barrels find the same mark.
  if (def.shots && def.shots > 1) {
    for (let i = 1; i < def.shots; i++) {
      def.fire({
        world,
        worm: s,
        dirX,
        dirY,
        power: shot.power,
        fuse: 0,
        bounceHigh: false,
        target: null,
        setting: game.scheme.weapons[def.id] ?? { ammo: 1, power: 3, delay: 0, crate: 0 },
        upgrades: game.scheme.upgrades,
        focus: () => {},
        control: () => {},
      });
    }
  }
  let quiet = 0;
  for (let t = 0; t < PROBE_TICKS && quiet < 10; t++) {
    world.step();
    world.events.length = 0;
    quiet = world.isBusy() ? 0 : quiet + 1;
  }
  for (const [id, w] of copies) {
    const before = (src.byId(id) as Worm).health;
    const lost = w.alive ? before - Math.max(0, w.health) : before;
    if (lost > 0) result.damage.set(id, lost);
    if (!w.alive || w.health <= 0) result.killed.add(id);
  }
  return result;
}
