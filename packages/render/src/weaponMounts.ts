import { skinById, type SkinId, type SkinPose, type SkinProfile } from './skins';

export type WeaponMountMode =
  | 'sidearm'
  | 'longgun'
  | 'shoulder'
  | 'heavy'
  | 'grounded'
  | 'throwable'
  | 'placed'
  | 'melee'
  | 'tool'
  | 'remote'
  | 'backpack'
  | 'none';
export interface WeaponMount {
  mode: WeaponMountMode;
  /** Visible equipment width in world units, independent of PNG or character size. */
  width: number;
  grip: readonly [number, number];
  /** Barrel centre within the tightly cropped art; independent from the lower pistol grip. */
  barrelY?: number;
  pose: SkinPose;
  aim: boolean;
  texture?: string;
  angle?: number;
}
const mounts = new Map<string, WeaponMount>();
const add = (ids: string, mount: WeaponMount) => {
  for (const id of ids.split(' ')) {
    if (mounts.has(id)) throw new Error(`Duplicate weapon mount: ${id}`);
    mounts.set(id, mount);
  }
};
add('handgun', { mode: 'sidearm', width: 8, grip: [0.3, 0.58], pose: 'aim', aim: true });
add('uzi', { mode: 'sidearm', width: 13, grip: [0.32, 0.58], pose: 'aim', aim: true });
add('magicbullet', { mode: 'sidearm', width: 10, grip: [0.28, 0.5], pose: 'aim', aim: true });
add('shotgun', { mode: 'longgun', width: 22, grip: [0.36, 0.56], pose: 'aim', aim: true });
add('longbow', { mode: 'longgun', width: 19, grip: [0.5, 0.5], pose: 'aim', aim: true });
add('bazooka', {
  mode: 'shoulder',
  width: 30,
  grip: [0.28, 0.76],
  barrelY: 0.39,
  pose: 'aim',
  aim: true,
});
add('homing', {
  mode: 'shoulder',
  width: 29,
  grip: [0.28, 0.76],
  barrelY: 0.39,
  pose: 'aim',
  aim: true,
  texture: 'skins/weapons/bazooka',
});
add('sheeplauncher', { mode: 'shoulder', width: 31, grip: [0.35, 0.6], pose: 'aim', aim: true });
add('minigun', { mode: 'heavy', width: 29, grip: [0.3, 0.48], pose: 'aim', aim: true });
add('flamethrower', { mode: 'heavy', width: 24, grip: [0.3, 0.52], pose: 'aim', aim: true });
add('mortar', { mode: 'grounded', width: 21, grip: [0.15, 0.5], pose: 'land', aim: true });
add('grenade', {
  mode: 'throwable',
  width: 9,
  grip: [0.5, 0.7],
  pose: 'aim',
  aim: false,
  texture: 'proj/grenade',
});
add('cluster', {
  mode: 'throwable',
  width: 9,
  grip: [0.5, 0.7],
  pose: 'aim',
  aim: false,
  texture: 'proj/cluster',
});
add('hhg', { mode: 'throwable', width: 7, grip: [0.5, 0.7], pose: 'aim', aim: false });
add('banana petrol', { mode: 'throwable', width: 8, grip: [0.5, 0.7], pose: 'aim', aim: false });
add('superbanana salvation vase', {
  mode: 'throwable',
  width: 10,
  grip: [0.5, 0.7],
  pose: 'aim',
  aim: false,
});
add('mbbomb', { mode: 'throwable', width: 13, grip: [0.5, 0.7], pose: 'aim', aim: false });
add('dynamite mine molebomb', {
  mode: 'placed',
  width: 8,
  grip: [0.5, 0.8],
  pose: 'land',
  aim: false,
});
add('sheep supersheep skunk pigeon', {
  mode: 'placed',
  width: 12,
  grip: [0.5, 0.8],
  pose: 'land',
  aim: false,
});
add('madcows oldwoman frenchsheep', {
  mode: 'placed',
  width: 15,
  grip: [0.5, 0.8],
  pose: 'land',
  aim: false,
});
add('bat axe', {
  mode: 'melee',
  width: 22,
  grip: [0.22, 0.6],
  pose: 'melee',
  aim: false,
  angle: -0.65,
});
add('prod firepunch dragonball kamikaze suicide', {
  mode: 'melee',
  width: 0,
  grip: [0.5, 0.5],
  pose: 'melee',
  aim: false,
});
add('blowtorch', { mode: 'tool', width: 13, grip: [0.3, 0.6], pose: 'aim', aim: true });
add('drill', {
  mode: 'tool',
  width: 18,
  grip: [0.3, 0.5],
  pose: 'land',
  aim: false,
  angle: Math.PI / 2,
});
add('rope', { mode: 'tool', width: 12, grip: [0.25, 0.6], pose: 'aim', aim: true });
add('jetpack', {
  mode: 'backpack',
  width: 12,
  grip: [0.5, 0.6],
  pose: 'idle',
  aim: false,
  texture: 'objects/jetpack',
});
add('airstrike napalm mail minestrike molesquad carpet nuke armageddon donkey', {
  mode: 'remote',
  width: 7,
  grip: [0.45, 0.7],
  pose: 'aim',
  aim: false,
  texture: 'skins/equipment/radio',
});
add(
  'girder girderpack teleport earthquake lowgravity fastwalk laser invisible doubledamage cratespy scales selectworm freeze',
  {
    mode: 'remote',
    width: 6,
    grip: [0.45, 0.7],
    pose: 'aim',
    aim: false,
    texture: 'skins/equipment/detonator',
  },
);
add('bungee parachute skipgo surrender', {
  mode: 'none',
  width: 0,
  grip: [0.5, 0.5],
  pose: 'idle',
  aim: false,
});
// The inventory is a symbol; deployed animals use the same detailed art as world entities.
for (const [id, texture] of Object.entries({
  sheep: 'creatures/sheep_0',
  supersheep: 'creatures/supersheep_0',
  pigeon: 'creatures/pigeon_0',
  madcows: 'creatures/cow',
  oldwoman: 'creatures/oldwoman',
  frenchsheep: 'proj/frenchsheep',
})) {
  mounts.set(id, { ...mounts.get(id)!, texture });
}
export const WEAPON_MOUNTS: ReadonlyMap<string, WeaponMount> = mounts;

export interface SkinRig {
  hand: readonly [number, number];
  shoulder: readonly [number, number];
  lowHand: readonly [number, number];
  ground: readonly [number, number];
}
const RIGS: Record<SkinProfile, SkinRig> = {
  heavy: { hand: [7, -9], shoulder: [0, -10], lowHand: [7, -5], ground: [12, 0] },
  soft: { hand: [8, -8], shoulder: [0, -9], lowHand: [8, -4], ground: [14, 0] },
  glam: { hand: [7, -10], shoulder: [0, -11], lowHand: [7, -5], ground: [12, 0] },
  dominant: { hand: [7, -11], shoulder: [0, -12], lowHand: [7, -5], ground: [12, 0] },
  elder: { hand: [7, -8], shoulder: [0, -9], lowHand: [7, -4], ground: [12, 0] },
  sick: { hand: [7, -8], shoulder: [0, -9], lowHand: [7, -4], ground: [12, 0] },
  veteran: { hand: [7, -9], shoulder: [0, -10], lowHand: [7, -5], ground: [13, 0] },
  classic: { hand: [7, -10], shoulder: [0, -11], lowHand: [7, -5], ground: [12, 0] },
  // Painted opera-glove palms sit higher than the classic chest line.
  nocturne: { hand: [7, -12], shoulder: [0, -12], lowHand: [7, -5], ground: [12, 0] },
};
const OVERRIDES: Partial<Record<SkinId, Partial<SkinRig>>> = {
  'commando-femme': { hand: [7, -10], shoulder: [0, -11] },
  'soft-femme': { hand: [8, -8], shoulder: [0, -9] },
  'glam-femme': { hand: [8, -10], lowHand: [7, -5] },
  'glam-rocker': { hand: [8, -9], shoulder: [0, -10] },
  'elder-femme': { hand: [7, -8], shoulder: [0, -9] },
  'veteran-femme': { hand: [8, -9], ground: [14, 0] },
  // Their forward hands sit higher than the family's default chest line.
  'veteran-sailor': { hand: [8, -11.5] },
  'classic-punk': { hand: [8, -13] },
};
export function rigForSkin(id: SkinId): SkinRig {
  return { ...RIGS[skinById(id)!.profile], ...OVERRIDES[id] };
}
