import { describe, expect, it } from 'vitest';
import { PANEL_ROWS, RULESET, SCHEMES, weaponInfo } from '../src';
import { arsenalScheme } from '../src/schemes';

/*
 * Registry consistency: every weapon of the shipped ruleset is a complete record. What the renderer
 * knows about (looks) is checked in apps/client/test/registry.test.ts, which may see both packages.
 */
const specs = RULESET.weapons.map((d) => d.spec);

describe('weapon registry', () => {
  it('has unique ids and the panel order is row, then column', () => {
    expect(new Set(specs.map((s) => s.id)).size).toBe(specs.length);
    const cells = specs.map((s) => s.ui.row * 100 + s.ui.col);
    expect(cells).toEqual([...cells].sort((a, b) => a - b));
  });

  it('gives every weapon its own panel cell inside the panel', () => {
    const seen = new Map<string, string>();
    for (const s of specs) {
      const cell = `${s.ui.row}.${s.ui.col}`;
      expect(seen.get(cell), `${s.id} collides with ${seen.get(cell)} at ${cell}`).toBeUndefined();
      seen.set(cell, s.id);
      expect(s.ui.row, s.id).toBeGreaterThanOrEqual(0);
      expect(s.ui.row, s.id).toBeLessThan(PANEL_ROWS.length);
      expect(s.ui.col, s.id).toBeGreaterThanOrEqual(0);
    }
  });

  it('has a Russian name, a hint and an icon for every weapon', () => {
    for (const s of specs) {
      expect(s.ui.name, s.id).toMatch(/[А-Яа-яЁё]/);
      expect(s.ui.hint, s.id).not.toBe('');
      expect(s.ui.icon, s.id).not.toBe('');
      expect(weaponInfo(s.id), s.id).toBe(s.ui);
    }
  });

  it('puts every weapon into at least one scheme, or marks it as unlisted', () => {
    const inSchemes = new Set([...SCHEMES, arsenalScheme()].flatMap((s) => Object.keys(s.weapons)));
    // The test bed lists everything, so look at the real schemes only.
    const real = new Set(SCHEMES.flatMap((s) => Object.keys(s.weapons)));
    expect(inSchemes.size).toBe(specs.length);
    for (const s of specs) {
      if (s.listing === 'unlisted')
        expect(real.has(s.id), `${s.id} is listed after all`).toBe(false);
      else
        expect(real.has(s.id), `${s.id}: in no scheme (add a slot or mark it unlisted)`).toBe(true);
    }
  });

  it('tells the bots which weapons to use, with a distinct preference rank', () => {
    const ranks = specs.filter((s) => s.ai.usable).map((s) => s.ai.rank);
    for (const s of specs.filter((s) => s.ai.usable)) expect(s.ai.rank, s.id).toBeTypeOf('number');
    expect(new Set(ranks).size).toBe(ranks.length);
    for (const d of RULESET.weapons)
      if (d.spec.ai.reach) expect(d.aim, `${d.id}: reach needs a no-aim weapon`).toBe('none');
  });
});
