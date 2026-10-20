import { describe, expect, it } from 'vitest';
import { allWeapons, getWeapon } from '@wr/sim';
import { arsenalScheme, schemeById, SCHEMES } from '../src/schemes';
import { TEAM_PRESETS } from '../src/teams';

describe('content', () => {
  it('schemes only reference registered weapons', () => {
    for (const s of SCHEMES) {
      for (const id of Object.keys(s.weapons))
        expect(getWeapon(id), `${s.id}: ${id}`).toBeDefined();
    }
  });

  it('the arsenal test bed has every weapon with infinite ammo and no delay', () => {
    const s = arsenalScheme();
    expect(schemeById('arsenal')).toBe(s);
    expect(SCHEMES).not.toContain(s);
    for (const d of allWeapons())
      expect(s.weapons[d.id], d.id).toMatchObject({ ammo: -1, delay: 0 });
  });

  it('team presets have 8 unique worm names', () => {
    for (const t of TEAM_PRESETS) expect(new Set(t.worms).size).toBe(8);
  });
});

describe('weapon info', () => {
  it('every registered weapon has a localised name and icon', async () => {
    const { allWeapons } = await import('@wr/sim');
    const { WEAPON_INFO } = await import('../src/weapons');
    for (const w of allWeapons()) {
      if (w.id.startsWith('test-')) continue;
      expect(WEAPON_INFO[w.id], w.id).toBeDefined();
    }
  });
});
