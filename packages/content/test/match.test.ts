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
  it('cosmetic skin choices do not enter setup, hashes or movement rules', () => {
    const plain = buildGameSetup(cfg);
    const skinned = buildGameSetup({
      ...cfg,
      teams: cfg.teams.map((team, i) => ({
        ...team,
        skin: i ? 'dominatrix' : 'veteran',
        characterClass: i ? 'heavy' : 'elder',
        characterVariants: i ? ['brutal', 'commando-femme'] : ['elder', 'elder-femme'],
      })),
    });
    expect(skinned.teams).toEqual(plain.teams);
    expect(skinned.spawns).toEqual(plain.spawns);
    const a = new Game(plain),
      b = new Game(skinned);
    expect(a.hash()).toBe(b.hash());
    for (let i = 0; i < 60; i++) {
      a.step();
      b.step();
    }
    expect(a.hash()).toBe(b.hash());
  });
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
