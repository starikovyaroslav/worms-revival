import { describe, expect, it } from 'vitest';
import { Game } from '@wr/sim';
import { buildGameSetup, RULESET, TEAM_PRESETS, type MatchConfig } from '@wr/content';
import { weaponHint } from '../src/ui/weaponHint';

const config: MatchConfig = {
  seed: 11,
  style: 'island',
  themeId: 'meadow',
  schemeId: 'arsenal',
  teams: TEAM_PRESETS.slice(0, 2).map((t) => ({ ...t, cpu: 0 })),
};

describe('weapon hints', () => {
  it('every weapon has a non-empty hint line', () => {
    const game = new Game(buildGameSetup(config));
    for (const d of RULESET.weapons) {
      game.weaponId = d.id;
      const h = weaponHint(game, null);
      expect(h?.text, d.id).toBeTruthy();
    }
  });

  it('click-to-fire weapons say the click launches, never "mark the target"', () => {
    const game = new Game(buildGameSetup(config));
    game.weaponId = 'airstrike';
    const text = weaponHint(game, null)?.text ?? '';
    expect(text).toContain('запуск сюда');
    expect(text).not.toContain('отметить');
  });

  it('warns when the strike would land within 40 px of an own worm', () => {
    const game = new Game(buildGameSetup(config));
    game.weaponId = 'airstrike';
    const w = game.activeWorm;
    if (!w) throw new Error('no worm');
    const near = weaponHint(game, { x: w.x + 20, y: w.y });
    expect(near?.warn).toBe(true);
    const far = weaponHint(game, { x: w.x + 400, y: w.y });
    expect(far?.warn).toBe(false);
    // Teleport never warns: it harms nobody.
    game.weaponId = 'teleport';
    expect(weaponHint(game, { x: w.x + 20, y: w.y })?.warn).toBe(false);
  });

  it('rope hints follow its state', () => {
    const game = new Game(buildGameSetup(config));
    game.weaponId = 'rope';
    expect(weaponHint(game, null)?.text).toContain('верёвкой');
  });
});
