import { Material, Terrain } from '../src/terrain/terrain';
import type { Scheme } from '../src/game/scheme';
import { NO_UPGRADES } from '../src/game/scheme';
import { Game } from '../src/game/game';

export function flatTerrain(width = 1000, height = 400, ground = 200): Terrain {
  const t = new Terrain(width, height);
  for (let y = ground; y < height; y++) for (let x = 0; x < width; x++) t.set(x, y, Material.Soil);
  return t;
}

export function testScheme(over: Partial<Scheme> = {}): Scheme {
  return {
    id: 'test',
    name: 'Test',
    turnTime: 10,
    retreatTime: 2,
    hotSeatTime: 0,
    roundTime: 600,
    wormHealth: 100,
    wormsPerTeam: 2,
    fallDamage: true,
    wormSelect: false,
    artillery: false,
    suddenDeath: 'health1',
    waterRise: 20,
    wind: 1,
    mines: 0,
    mineFuse: 3,
    duds: false,
    barrels: 0,
    crateChance: 0,
    healthCrate: 25,
    weapons: {},
    upgrades: NO_UPGRADES,
    ...over,
  };
}

export function makeGame(over: Partial<Scheme> = {}, seed = 1): Game {
  return new Game({
    seed,
    scheme: testScheme(over),
    teams: [
      { name: 'Red', worms: ['R1', 'R2'] },
      { name: 'Blue', worms: ['B1', 'B2'] },
    ],
    terrain: flatTerrain(),
    waterLevel: 390,
    spawns: [
      { x: 100, y: 199 },
      { x: 300, y: 199 },
      { x: 600, y: 199 },
      { x: 900, y: 199 },
    ],
  });
}

/** Steps until the predicate holds (or fails after `max` ticks). */
export function stepUntil(game: Game, pred: () => boolean, max = 5000): number {
  for (let i = 0; i < max; i++) {
    if (pred()) return i;
    game.step();
  }
  throw new Error('condition not reached');
}
