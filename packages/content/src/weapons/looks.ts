import type { Look, LookSpec } from '@wr/sim';

/**
 * Glow and trail of each projectile look (presentation only). A look without an entry draws no light
 * and leaves no trail. Looks are shared between weapons (a cluster bomb and a mortar both drop
 * `clusterlet`s), so this table sits next to the weapons, not inside one of them.
 */
const ROCKET: LookSpec = {
  light: { color: 0xffb050, radius: 55, intensity: 0.8, flicker: 0.15 },
  trail: 'rocket',
};
const FUSE: LookSpec = { trail: 'fuse' };

export const LOOKS: Partial<Record<Look, LookSpec>> = {
  missile: ROCKET,
  homing: ROCKET,
  mortar: { trail: 'rocket' },
  hhg: { light: { color: 0xffe9a0, radius: 70, intensity: 0.9, flicker: 0.1 }, trail: 'fuse' },
  grenade: FUSE,
  cluster: FUSE,
  banana: FUSE,
  bananalet: FUSE,
  dynamite: FUSE,
  mbbomb: FUSE,
  bullet: FUSE,
  meteor: { trail: 'meteor', light: { color: 0xdf7126, radius: 70, intensity: 1, flicker: 0.1 } },
  dragonball: { trail: 'energy', light: { color: 0xfbf236, radius: 55, intensity: 0.9 } },
  napalm: { trail: 'fire' },
  petrol: { trail: 'fire' },
  frenchsheep: { trail: 'fire', light: { color: 0xdf7126, radius: 45, intensity: 0.7 } },
  skunk: { trail: 'toxic' },
  letter: { trail: 'paper' },
};
