import { describe, expect, it } from 'vitest';
import { getWeapon } from '@wr/sim';
import { SCHEMES } from '../src/schemes';
import { TEAM_PRESETS } from '../src/teams';

describe('content', () => {
  it('schemes only reference registered weapons', () => {
    for (const s of SCHEMES) {
      for (const id of Object.keys(s.weapons))
        expect(getWeapon(id), `${s.id}: ${id}`).toBeDefined();
    }
  });

  it('team presets have 8 unique worm names', () => {
    for (const t of TEAM_PRESETS) expect(new Set(t.worms).size).toBe(8);
  });
});
