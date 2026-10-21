import { describe, expect, it } from 'vitest';
import { Game } from '@wr/sim';
import { buildGameSetup, TEAM_PRESETS, type MatchConfig } from '@wr/content';
import { turnsWord, weaponStatus } from '../src/ui/weaponStatus';

describe('turnsWord', () => {
  it('declines "ход" like Russian does', () => {
    expect(turnsWord(1)).toBe('1 ход');
    expect(turnsWord(2)).toBe('2 хода');
    expect(turnsWord(4)).toBe('4 хода');
    expect(turnsWord(5)).toBe('5 ходов');
    expect(turnsWord(11)).toBe('11 ходов');
    expect(turnsWord(21)).toBe('21 ход');
    expect(turnsWord(12)).toBe('12 ходов');
  });
});

describe('weaponStatus', () => {
  const config: MatchConfig = {
    seed: 7,
    style: 'island',
    themeId: 'meadow',
    schemeId: 'intermediate',
    teams: TEAM_PRESETS.slice(0, 2).map((t) => ({ ...t, cpu: 0 })),
  };

  it('says why a slot is unavailable: delay first, then empty ammo', () => {
    const game = new Game(buildGameSetup(config));
    const delayed = weaponStatus(game, 'airstrike');
    expect(delayed.usable).toBe(false);
    expect(delayed.delay).toBeGreaterThan(0);
    expect(delayed.reason).toBe(`Доступно через ${turnsWord(delayed.delay)}`);
    const team = game.teams[game.activeTeam];
    if (!team) throw new Error('no team');
    team.ammo.bazooka = 0;
    expect(weaponStatus(game, 'bazooka').reason).toBe('Нет боезапаса');
    expect(weaponStatus(game, 'grenade').reason).toBeNull();
  });
});
