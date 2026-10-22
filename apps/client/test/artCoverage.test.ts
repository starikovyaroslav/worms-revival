import { describe, expect, it } from 'vitest';
import { RULESET } from '@wr/content';
import { ART_PACKS, GENERATED_PROJECTILES, SKINS, SKIN_POSES, WEAPON_MOUNTS } from '@wr/render';
import legacy from '../public/assets/manifest.json';
import generated from '../public/assets/generated/manifest.json';
import arsenal from '../public/assets/arsenal/manifest.json';
import vfx from '../public/assets/vfx/manifest.json';
import military from '../public/assets/military/manifest.json';
import skins from '../public/assets/skins/manifest.json';
import painted from '../public/assets/painted-meadow/manifest.json';
import { PAINTED_MEADOW_REQUIRED } from '@wr/render';

const packs = [legacy, generated, arsenal, vfx, military, skins];
const merged = Object.assign({}, ...packs.map((p) => p.assets)) as Record<
  string,
  { file: string; w: number; h: number }
>;

describe('shipped artwork coverage', () => {
  it('ships an isolated optional painted pack at native density with smooth sampling', () => {
    expect(Object.keys(painted.assets)).toHaveLength(26);
    expect(painted.style).toBe('painted');
    for (const id of PAINTED_MEADOW_REQUIRED) expect(painted.assets).toHaveProperty(id);
    for (const [id, a] of Object.entries(painted.assets)) {
      expect(id.startsWith('painted/')).toBe(true);
      expect(id in merged).toBe(false);
      expect(a.sampling).toBe('linear');
      expect(Math.min(a.pixelW / a.w, a.pixelH / a.h)).toBeGreaterThanOrEqual(4);
    }
  });
  it('assigns an explicit size and mounting role to every weapon, including non-held utilities', () => {
    expect([...WEAPON_MOUNTS.keys()].sort()).toEqual(RULESET.weapons.map((w) => w.id).sort());
    for (const mount of WEAPON_MOUNTS.values()) {
      expect(Number.isFinite(mount.width)).toBe(true);
      expect(mount.width).toBeGreaterThanOrEqual(0);
      expect(mount.grip.every((v) => v >= 0 && v <= 1)).toBe(true);
    }
  });
  it('ships a full pose set for each available identity and explicitly reports unavailable art', () => {
    for (const skin of SKINS) {
      if (skin.id === 'dominatrix') {
        expect(skins.unavailable.dominatrix.state).toBe('blocked');
        expect(Object.keys(skins.assets).some((id) => id.startsWith(`skins/${skin.id}/`))).toBe(
          false,
        );
      } else
        for (const pose of SKIN_POSES) {
          expect(skins.assets).toHaveProperty(`skins/${skin.id}/${pose}`);
        }
    }
  });
  it('checks the same ordered packs that startup actually loads', () => {
    expect(ART_PACKS).toEqual([
      'assets',
      'assets/generated',
      'assets/arsenal',
      'assets/vfx',
      'assets/military',
      'assets/skins',
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
