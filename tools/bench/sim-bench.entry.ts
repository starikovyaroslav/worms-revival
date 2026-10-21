// Bench scenario: 8 worms, the arsenal scheme, bots playing. Bundled by tools/bench-sim.mjs.
import { Bot, type Plan } from '@wr/ai';
import { Game } from '@wr/sim';
import { buildGameSetup, TEAM_PRESETS, type MatchConfig } from '@wr/content';

export function run(ticks: number): { ms: number; hash: number } {
  const config: MatchConfig = {
    seed: 4242,
    style: 'island',
    themeId: 'meadow',
    schemeId: 'arsenal',
    teams: TEAM_PRESETS.slice(0, 2).map((t) => ({ ...t, cpu: 3 })),
  };
  // The arsenal scheme seats 8 worms per team; trim to 4 + 4.
  const setup = buildGameSetup(config);
  const game = new Game({
    ...setup,
    scheme: { ...setup.scheme, wormsPerTeam: 4 },
    spawns: setup.spawns.slice(0, 8),
  });
  let plan: Plan = [];
  let planTurn = -1;
  let ms = 0;
  for (let i = 0; i < ticks; i++) {
    if ((game.phase === 'ready' || game.phase === 'turn') && planTurn !== game.turn) {
      planTurn = game.turn;
      const think = new Bot(game, 3, config.seed + game.turn).think();
      let r = think.next();
      while (!r.done) r = think.next();
      plan = r.value;
    }
    const input = plan.shift() ?? [];
    const t = performance.now();
    game.step(input);
    ms += performance.now() - t;
  }
  return { ms, hash: game.hash() };
}
