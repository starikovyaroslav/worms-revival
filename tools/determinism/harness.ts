// Plays a bot-vs-bot match and returns state hashes. Bundled and run in Node and in every
// browser engine: identical output proves the simulation is deterministic across engines.
import { Bot, type Plan } from '@wr/ai';
import { Game, Hasher } from '@wr/sim';
import { generateMap } from '@wr/mapgen';
import { buildGameSetup, TEAM_PRESETS, type MatchConfig } from '@wr/content';

export function run(ticks = 4000): {
  hashes: number[];
  tick: number;
  health: number[];
  islandV2: number[];
  islandGameHash: number;
} {
  const config: MatchConfig = {
    seed: 31337,
    style: 'island',
    themeId: 'meadow',
    schemeId: 'intermediate',
    teams: TEAM_PRESETS.slice(0, 2).map((t) => ({ ...t, cpu: 3 })),
  };
  const game = new Game(buildGameSetup(config));
  let plan: Plan = [];
  let planTurn = -1;
  const hashes: number[] = [];
  for (let i = 0; i < ticks; i++) {
    if ((game.phase === 'ready' || game.phase === 'turn') && planTurn !== game.turn) {
      planTurn = game.turn;
      const think = new Bot(game, 3, config.seed + game.turn).think();
      let r = think.next();
      while (!r.done) r = think.next();
      plan = r.value;
    }
    game.step(plan.shift() ?? []);
    if (i % 250 === 0) hashes.push(game.hash());
  }
  const islandV2 = [1, 42, 77, 1847].map((seed) => {
    const h = new Hasher();
    generateMap({ seed, version: 2 }).terrain.hashInto(h);
    return h.digest();
  });
  const next = new Game(buildGameSetup({ ...config, mapVersion: 2 }));
  for (let i = 0; i < 240; i++) next.step();
  return {
    hashes,
    tick: game.world.tick,
    health: game.worms.map((w) => w.health),
    islandV2,
    islandGameHash: next.hash(),
  };
}
