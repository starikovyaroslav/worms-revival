import { iconAssets } from './icons.mjs';
import { iconAssets2 } from './icons2.mjs';
import { wormFrame, wormPoses } from './wormframes.mjs';

// What gets rendered: asset id → source SVG and pixel size (longer side, native game pixels).
// Retro rule: 1 art pixel = 1 world pixel at zoom 1, shown with nearest-neighbour filtering.
//   icon  = 32 px UI icon          world = small in-game sprite
const A = iconAssets();
const B = iconAssets2();

// Existing sources by weapon id.
const icon = {
  grenade: A['weapons/icon/grenade'],
  dynamite: A['weapons/icon/dynamite'],
  mine: A['weapons/icon/mine'],
  bazooka: A['weapons/icon/bazooka'],
  sheep: A['weapons/icon/sheep'],
  homing: B.homing,
  mortar: B.mortar,
  pigeon: B.pigeon,
  cluster: B.cluster,
  banana: B.banana,
  shotgun: B.shotgun,
  handgun: B.handgun,
  uzi: B.uzi,
  minigun: B.minigun,
  longbow: B.longbow,
  firepunch: B.firepunch,
  prod: B.prod,
  supersheep: B.supersheep,
  airstrike: B.airstrike,
  blowtorch: B.blowtorch,
  drill: B.drill,
  girder: B.girder,
  bat: B.bat,
  rope: B.rope,
  parachute: B.parachute,
  teleport: B.teleport,
  hhg: B.hhg,
  skipgo: B.skipgo,
  surrender: B.surrender,
};

/** @type {{ id: string, svg: string, px: number, crop?: boolean, tintable?: boolean }[]} */
export const CATALOG = [
  ...Object.entries(icon).map(([id, svg]) => ({ id: `weapons/icon/${id}`, svg, px: 32 })),

  // Objects lying around the map.
  { id: 'objects/crate-weapon', svg: A['objects/crate-weapon'], px: 18 },
  { id: 'objects/crate-health', svg: A['objects/crate-health'], px: 18 },
  { id: 'objects/barrel', svg: A['objects/barrel'], px: 18 },
  { id: 'objects/mine', svg: A['weapons/icon/mine'], px: 14 },
  { id: 'objects/tombstone', svg: B.tombstone, px: 18 },
  { id: 'objects/parachute', svg: B.parachute, px: 30 },

  // Projectiles and creatures in flight.
  { id: 'proj/grenade', svg: icon.grenade, px: 13 },
  { id: 'proj/cluster', svg: icon.cluster, px: 14 },
  { id: 'proj/bomblet', svg: B.bomblet, px: 6 },
  { id: 'proj/banana', svg: icon.banana, px: 14 },
  { id: 'proj/hhg', svg: icon.hhg, px: 14 },
  { id: 'proj/dynamite', svg: icon.dynamite, px: 16 },
  { id: 'proj/rocket', svg: B.rocket, px: 20 },
  { id: 'proj/arrow', svg: B.arrow, px: 22 },
  { id: 'proj/pigeon', svg: icon.pigeon, px: 20 },
  { id: 'proj/sheep', svg: icon.sheep, px: 22 },
  { id: 'proj/supersheep', svg: icon.supersheep, px: 24 },
];

// Worm animation frames: fixed 24×24 canvas (no cropping) so every frame shares the same feet anchor.
for (const [name, pose] of Object.entries(wormPoses())) {
  const f = wormFrame(pose);
  CATALOG.push({ id: `worm/${name}`, svg: f.body, px: 24, crop: false });
  CATALOG.push({ id: `worm/${name}_band`, svg: f.band, px: 24, crop: false, tintable: true });
}
