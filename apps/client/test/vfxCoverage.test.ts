import { describe, expect, it } from 'vitest';
import { RULESET, WEAPON_VFX, weaponFx } from '@wr/content';
import { RECIPES } from '@wr/render';

describe('weapon VFX coverage', () => {
  it('gives upgraded rockets their own layered impact, without renaming the actual weapon', () => {
    expect(weaponFx('bazooka', 'standard').recipe).toBe('explosion');
    expect(weaponFx('bazooka', 'mk2').recipe).toBe('explosion-heavy');
    expect(weaponFx('homing', 'mk2').recipe).toBe('explosion-heavy');
    expect(weaponFx('grenade', 'mk2')).toEqual(weaponFx('grenade'));
    expect(
      RECIPES['explosion-heavy']!.layers.some((l) => l.type === 'burst' && (l.at ?? 0) > 0),
    ).toBe(true);
  });
  it('explicitly maps the full current arsenal to a valid recipe or a non-explosive action', () => {
    expect(Object.keys(WEAPON_VFX).sort()).toEqual(RULESET.weapons.map((w) => w.id).sort());
    for (const w of RULESET.weapons) {
      const p = WEAPON_VFX[w.id]!;
      expect(p.recipe === 'none' || !!RECIPES[p.recipe], w.id).toBe(true);
      expect(p.scale).toBeGreaterThan(0);
    }
  });
  it('distinguishes blast families rather than scaling one universal explosion', () => {
    const ids = ['bazooka', 'grenade', 'napalm', 'hhg', 'nuke', 'skunk', 'mail', 'banana', 'sheep'];
    expect(new Set(ids.map((id) => weaponFx(id).recipe)).size).toBe(ids.length);
    expect(weaponFx('barrel').recipe).toBe('explosion-fire');
    expect(weaponFx('unknown').recipe).toBe('explosion');
  });
});
