import { NO_UPGRADES, type Scheme, type WeaponSetting } from '@wr/sim';

const w = (ammo: number, power = 3, delay = 0, crate = 2): WeaponSetting => ({
  ammo,
  power,
  delay,
  crate,
});
const INF = -1;

const BASE: Omit<Scheme, 'id' | 'name' | 'weapons'> = {
  turnTime: 45,
  retreatTime: 5,
  hotSeatTime: 5,
  roundTime: 15 * 60,
  wormHealth: 100,
  wormsPerTeam: 4,
  fallDamage: true,
  wormSelect: false,
  artillery: false,
  suddenDeath: 'health1',
  waterRise: 20,
  wind: 1,
  mines: 8,
  mineFuse: 3,
  duds: true,
  barrels: 4,
  crateChance: 40,
  healthCrate: 25,
  upgrades: NO_UPGRADES,
};

/** The default: plenty of basic weapons, limited powerful ones. */
export const INTERMEDIATE: Scheme = {
  ...BASE,
  id: 'intermediate',
  name: 'Intermediate',
  weapons: {
    bazooka: w(INF),
    grenade: w(INF),
    cluster: w(5),
    shotgun: w(INF),
    firepunch: w(INF),
    bat: w(1),
    prod: w(INF),
    dynamite: w(1),
    mine: w(2),
    airstrike: w(1, 3, 2),
    banana: w(1, 3, 3),
    hhg: w(1, 3, 3),
    sheep: w(1),
    supersheep: w(1, 3, 2),
  },
};

/** Bazooka and Grenade: pure ballistics, no crates, no clutter. */
export const BNG: Scheme = {
  ...BASE,
  id: 'bng',
  name: 'BnG',
  turnTime: 30,
  roundTime: 20 * 60,
  suddenDeath: 'water',
  mines: 0,
  barrels: 0,
  crateChance: 0,
  weapons: {
    bazooka: w(INF, 3, 0, 0),
    grenade: w(INF, 3, 0, 0),
  },
};

export const SCHEMES: Scheme[] = [INTERMEDIATE, BNG];

export function schemeById(id: string): Scheme {
  return SCHEMES.find((s) => s.id === id) ?? INTERMEDIATE;
}
