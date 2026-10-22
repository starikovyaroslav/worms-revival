import { assets } from './assets';
import type { Theme } from './theme';
import { WEAPON_MOUNTS } from './weaponMounts';
import { VFX_CLIPS } from './vfxCatalog';

export const PAINTED_MEADOW_PACK = 'assets/painted-meadow';
export const PAINTED_PACKS = [
  PAINTED_MEADOW_PACK,
  'assets/painted-desert',
  'assets/painted-arctic',
  'assets/painted-hell',
  'assets/painted-common',
];
export const PAINTED_VARIANT = 'painted/common/';
export const PAINTED_COMMON_REQUIRED = [
  ...[...WEAPON_MOUNTS.keys()].map((id) => `weapons/icon/${id}`),
  ...Object.entries(VFX_CLIPS).flatMap(([id, clip]) =>
    Array.from({ length: clip.frames }, (_, i) => `vfx/${id}_${i}`),
  ),
  ...[
    'crate_weapon',
    'crate_health',
    'crate_utility',
    'crate_open',
    'barrel',
    'barrel_burning',
    'mine_off',
    'mine_armed',
    'parachute',
    'grave_cross',
    'grave_round',
    'grave_slab',
    'grave_skull',
    'dynamite',
    'canister',
    'jetpack',
    'petrol-bottle',
  ].map((id) => `objects/${id}`),
  ...[
    'sheep_0',
    'sheep_1',
    'supersheep_0',
    'supersheep_1',
    'pigeon_0',
    'pigeon_1',
    'mole_0',
    'mole_1',
    'cow',
    'oldwoman',
    'nun',
    'donkey',
    'skunk',
    'banana_0',
    'banana_1',
    'stink',
    'donkey_fall',
  ].map((id) => `creatures/${id}`),
  ...[
    'bazooka',
    'handgun',
    'shotgun',
    'uzi',
    'minigun',
    'longbow',
    'flamethrower',
    'sheeplauncher',
    'blowtorch',
    'drill',
    'rope',
  ].map((id) => `skins/weapons/${id}`),
  ...['mortar-base', 'mortar-barrel', 'radio', 'detonator'].map((id) => `skins/equipment/${id}`),
  'materials/rock',
  'materials/steel',
  'ui/logo-menu',
].map((id) => PAINTED_VARIANT + id);
export const paintedCommonReady = () => PAINTED_COMMON_REQUIRED.every((id) => assets.has(id));
export const PAINTED_MEADOW_REQUIRED = [
  ...['sky', 'far', 'mid', 'near'].map((name) => `painted/bg/meadow/${name}`),
  ...['fill', 'rim', 'under', 'scorch', 'rock'].map((name) => `painted/terrain/meadow/${name}`),
  'painted/water/meadow',
  ...['blast', 'smoke', 'fragment', 'fire'].flatMap((name) =>
    [0, 1, 2, 3].map((i) => `painted/vfx/${name}_${i}`),
  ),
];
export function paintedMeadowReady(): boolean {
  return PAINTED_MEADOW_REQUIRED.every((id) => assets.has(id));
}
export function paintedBiomeReady(id: string): boolean {
  return (
    ['meadow', 'desert', 'arctic', 'hell'].includes(id) &&
    [
      ...['sky', 'far', 'mid', 'near'].map((name) => `painted/bg/${id}/${name}`),
      ...['fill', 'rim', 'under', 'scorch', 'rock'].map((name) => `painted/terrain/${id}/${name}`),
      `painted/water/${id}`,
    ].every((key) => assets.has(key)) &&
    paintedMeadowReady()
  );
}
export function paintedTheme(theme: Theme, requested: boolean): Theme {
  return requested && paintedBiomeReady(theme.id) && paintedCommonReady()
    ? {
        ...theme,
        artStyle: 'painted',
        grade: { saturation: 1, contrast: 1, brightness: 1, gamma: 1 },
      }
    : theme;
}
export function paintedMeadowTheme(theme: Theme, requested: boolean): Theme {
  return requested && theme.id === 'meadow' && paintedMeadowReady()
    ? {
        ...theme,
        artStyle: 'painted',
        sky: [0x238afa],
        skyTop: 0x238afa,
        grade: { saturation: 1, contrast: 1, brightness: 1, gamma: 1 },
      }
    : theme;
}
