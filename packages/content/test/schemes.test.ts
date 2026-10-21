import { describe, expect, it } from 'vitest';
import { arsenalScheme, schemeById, SCHEMES } from '../src/schemes';
import { TEAM_PRESETS } from '../src/teams';
import { RULESET } from '../src/weapons';

describe('content', () => {
  it('schemes only reference registered weapons', () => {
    for (const s of SCHEMES) {
      for (const id of Object.keys(s.weapons))
        expect(RULESET.get(id), `${s.id}: ${id}`).toBeDefined();
    }
  });

  it('the arsenal test bed has every weapon with infinite ammo and no delay', () => {
    const s = arsenalScheme();
    expect(schemeById('arsenal')).toBe(s);
    expect(SCHEMES).not.toContain(s);
    for (const d of RULESET.weapons)
      expect(s.weapons[d.id], d.id).toMatchObject({ ammo: -1, delay: 0 });
  });

  it('team presets have 8 unique worm names', () => {
    for (const t of TEAM_PRESETS) expect(new Set(t.worms).size).toBe(8);
  });
});
