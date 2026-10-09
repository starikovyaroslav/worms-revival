import { iconAssets } from './icons.mjs';
import { iconAssets2 } from './icons2.mjs';

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

const DRAWN_ICONS = new Set([
  'homing',
  'pigeon',
  'minigun',
  'drill',
  'teleport',
  'hhg',
  'skipgo',
  'surrender',
]);

/** @type {{ id: string, svg: string, px: number, crop?: boolean, tintable?: boolean }[]} */
export const CATALOG = [
  // Only weapons without a hand-made sprite in public/assets are drawn from code.
  ...Object.entries(icon)
    .filter(([id]) => DRAWN_ICONS.has(id))
    .map(([id, svg]) => ({ id: `weapons/icon/${id}`, svg, px: 32 })),

  // Projectiles and creatures in flight.
  { id: 'proj/grenade', svg: icon.grenade, px: 13 },
  { id: 'proj/cluster', svg: icon.cluster, px: 14 },
  { id: 'proj/bomblet', svg: B.bomblet, px: 6 },
  { id: 'proj/banana', svg: icon.banana, px: 14 },
  { id: 'proj/hhg', svg: icon.hhg, px: 14 },
  { id: 'proj/rocket', svg: B.rocket, px: 20 },
  { id: 'proj/arrow', svg: B.arrow, px: 22 },
  { id: 'proj/pigeon', svg: icon.pigeon, px: 20 },
  { id: 'proj/supersheep', svg: icon.supersheep, px: 24 },
];
