import { Game } from '@wr/sim';
import { flatTerrain, stepUntil, testScheme } from '../../../sim/test/helpers';
import { RULESET } from '../../src/weapons';
import type { Scheme } from '@wr/sim';

export { flatTerrain, stepUntil, testScheme };

/** A two-team game on flat ground, played by the real ruleset (the weapons of the shipped game). */
export function makeGame(over: Partial<Scheme> = {}, seed = 1): Game {
  return new Game({
    seed,
    scheme: testScheme(over),
    rules: RULESET,
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
