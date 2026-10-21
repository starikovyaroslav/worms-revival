import { describe, expect, it } from 'vitest';
import { RULESET } from '@wr/content';
import { ART_PACKS, GENERATED_PROJECTILES } from '@wr/render';
import legacy from '../public/assets/manifest.json';
import generated from '../public/assets/generated/manifest.json';
import arsenal from '../public/assets/arsenal/manifest.json';
import vfx from '../public/assets/vfx/manifest.json';
import military from '../public/assets/military/manifest.json';

const packs = [legacy, generated, arsenal, vfx, military];
const merged = Object.assign({}, ...packs.map((p) => p.assets)) as Record<
  string,
  { file: string; w: number; h: number }
>;

describe('shipped artwork coverage', () => {
  it('checks the same ordered packs that startup actually loads', () => {
    expect(ART_PACKS).toEqual([
      'assets',
      'assets/generated',
      'assets/arsenal',
      'assets/vfx',
      'assets/military',
    ]);
    expect(packs.every((p) => p.version === 2 && p.style === 'pixel')).toBe(true);
  });

  it('provides a PNG icon for every registered weapon/utility, not just a text fallback', () => {
    for (const weapon of RULESET.weapons)
      expect(merged[`weapons/icon/${weapon.id}`], weapon.id).toBeDefined();
  });

  it('does not overwrite a previous asset and adds 35 correctly sized icons', () => {
    const previous = { ...legacy.assets, ...generated.assets };
    const added = Object.entries(arsenal.assets);
    expect(added).toHaveLength(48);
    for (const [id] of added) expect(id in previous, id).toBe(false);
    const icons = added.filter(([id]) => id.startsWith('weapons/icon/'));
    expect(icons).toHaveLength(35);
    for (const [id, a] of icons) expect([a.w, a.h], id).toEqual([14, 14]);
  });

  it('covers each formerly procedural projectile plus the pack and both fire frames', () => {
    for (const look of [
      'meteor',
      'vase',
      'shard',
      'bullet',
      'mbbomb',
      'dragonball',
      'napalm',
      'carpet',
      'letter',
      'frenchsheep',
    ] as const) {
      const id = GENERATED_PROJECTILES[look];
      expect(id, look).toBeDefined();
      expect(merged[id!], look).toBeDefined();
    }
    for (const id of ['objects/jetpack', 'fx/flame_0', 'fx/flame_1'])
      expect(merged[id], id).toBeDefined();
  });
});
