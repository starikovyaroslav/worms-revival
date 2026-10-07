import { describe, expect, it } from 'vitest';
import { Game } from '@wr/sim';
import { buildGameSetup, type MatchConfig } from '../src/match';
import { TEAM_PRESETS } from '../src/teams';

const cfg: MatchConfig = {
  seed: 77,
  style: 'island',
  themeId: 'meadow',
  schemeId: 'intermediate',
  teams: TEAM_PRESETS.slice(0, 3).map((t) => ({ ...t, cpu: 0 })),
};

describe('buildGameSetup', () => {
  it('places every worm and the scheme objects', () => {
    const setup = buildGameSetup(cfg);
    expect(setup.spawns.length).toBe(3 * setup.scheme.wormsPerTeam);
    expect(setup.objects!.length).toBe(setup.scheme.mines + setup.scheme.barrels);
  });

  it('produces identical games from the same config', () => {
    const run = () => {
      const g = new Game(buildGameSetup(cfg));
      for (let i = 0; i < 300; i++) g.step();
      return g.hash();
    };
    expect(run()).toBe(run());
  });
});
