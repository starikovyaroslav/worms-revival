import { WEAPONS } from './weapons';
import type { PresentationVariant } from '@wr/sim';

export interface WeaponFx {
  recipe: string;
  scale: number;
  accent: number;
  scorch: boolean;
}

const standard: WeaponFx = { recipe: 'explosion', scale: 1, accent: 0xffc070, scorch: true };
/** Individual source mapping, shared animation families rather than 67 unrelated art styles. */
export const WEAPON_VFX: Record<string, WeaponFx> = Object.fromEntries(
  WEAPONS.map((w) => [
    w.id,
    {
      recipe: ['hitscan', 'burst', 'melee'].includes(w.sim.archetype) ? 'impact' : 'none',
      scale: 1,
      accent: 0xfbf236,
      scorch: false,
    },
  ]),
);
function assign(ids: string[], recipe: string, accent: number, scorch = true, scale = 1): void {
  for (const id of ids) WEAPON_VFX[id] = { recipe, accent, scorch, scale };
}
assign(['bazooka', 'homing', 'mortar', 'airstrike'], 'explosion', 0xffc070);
assign(
  ['grenade', 'cluster', 'dynamite', 'mine', 'minestrike', 'mbbomb', 'vase'],
  'explosion-fragment',
  0xfbf236,
);
assign(
  ['petrol', 'napalm', 'flamethrower', 'firepunch', 'dragonball', 'frenchsheep'],
  'explosion-fire',
  0xdf7126,
);
assign(['banana', 'superbanana'], 'explosion-banana', 0xfbf236);
assign(
  [
    'sheep',
    'supersheep',
    'molebomb',
    'molesquad',
    'sheeplauncher',
    'madcows',
    'oldwoman',
    'salvation',
    'donkey',
  ],
  'explosion-animal',
  0xcbdbfc,
);
assign(['hhg'], 'explosion-energy', 0xfbf236, false, 1.1);
assign(['magicbullet'], 'explosion-energy', 0x5fcde4, false);
assign(['skunk'], 'explosion-toxic', 0x99e550, false);
assign(['mail'], 'explosion-paper', 0xcbdbfc);
assign(['carpet'], 'explosion-fragment', 0xd9a066, true, 0.95);
assign(['armageddon'], 'explosion-meteor', 0xdf7126, true, 1.1);
assign(['nuke'], 'explosion-nuke', 0x99e550, false, 1.3);
assign(['kamikaze', 'suicide'], 'explosion', 0xd95763);

const specials: Record<string, WeaponFx> = {
  barrel: { ...standard, recipe: 'explosion-fire' },
  crate: { ...standard, recipe: 'explosion-fragment' },
  projectile: standard,
  'worm-death': { ...standard, recipe: 'explosion-animal', scorch: false },
};

export function weaponFx(source = 'generic', variant: PresentationVariant = 'standard'): WeaponFx {
  const base = WEAPON_VFX[source] ?? specials[source] ?? standard;
  return variant === 'mk2' && (source === 'bazooka' || source === 'homing')
    ? { ...base, recipe: 'explosion-heavy', accent: 0xfff4cc, scale: 1.08 }
    : base;
}
