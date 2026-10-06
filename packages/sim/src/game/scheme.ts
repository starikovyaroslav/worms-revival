/** Per-weapon scheme settings, as in W:A. */
export interface WeaponSetting {
  /** Starting ammo; -1 = infinite. */
  ammo: number;
  /** 1..5 stars: scales damage and blast size. */
  power: number;
  /** Turns (rounds) before the weapon can be used. */
  delay: number;
  /** Weight in weapon crates, 0..5. */
  crate: number;
}

export type SuddenDeathEvent = 'water' | 'health1' | 'nuclear' | 'end' | 'none';

export interface Upgrades {
  grenade: boolean;
  shotgun: boolean;
  clusters: boolean;
  longbow: boolean;
  aquaSheep: boolean;
}

export interface Scheme {
  id: string;
  name: string;
  /** Seconds. */
  turnTime: number;
  retreatTime: number;
  /** Thinking time before the turn timer starts. */
  hotSeatTime: number;
  /** Seconds until Sudden Death; 0 = immediately. */
  roundTime: number;
  wormHealth: number;
  wormsPerTeam: number;
  fallDamage: boolean;
  /** Pick which worm to move each turn. */
  wormSelect: boolean;
  /** Worms cannot walk. */
  artillery: boolean;
  suddenDeath: SuddenDeathEvent;
  /** Pixels the water rises per turn during Sudden Death. */
  waterRise: number;
  /** 0..1 scale of the random wind. */
  wind: number;
  mines: number;
  /** Mine fuse in seconds; -1 = random 0..3. */
  mineFuse: number;
  duds: boolean;
  barrels: number;
  /** Chance per turn, 0..100. */
  crateChance: number;
  healthCrate: number;
  weapons: Record<string, WeaponSetting>;
  upgrades: Upgrades;
}

export const NO_UPGRADES: Upgrades = {
  grenade: false,
  shotgun: false,
  clusters: false,
  longbow: false,
  aquaSheep: false,
};

export function weaponSetting(scheme: Scheme, id: string): WeaponSetting {
  return scheme.weapons[id] ?? { ammo: 0, power: 3, delay: 0, crate: 0 };
}
