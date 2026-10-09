import type { Upgrades, WeaponSetting } from '../game/scheme';
import type { World } from '../world/world';
import type { Worm } from '../worm/worm';

/** How the player points the weapon. */
export type AimMode = 'angle' | 'target' | 'none';

export interface FireContext {
  world: World;
  worm: Worm;
  /** Unit aim direction (screen coordinates: y grows downwards). */
  dirX: number;
  dirY: number;
  /** Charge 0..1 for charged weapons, 1 otherwise. */
  power: number;
  /** Fuse in ticks. */
  fuse: number;
  bounceHigh: boolean;
  target: { x: number; y: number } | null;
  setting: WeaponSetting;
  upgrades: Upgrades;
  /** Ask the camera to follow an entity. */
  focus(entityId: number): void;
  /** Hand the controls over to an entity (sheep): fire and arrows go to it until it is gone. */
  control(entityId: number): void;
}

/** Entities the player keeps controlling after the shot (sheep, super sheep). */
export interface RemoteControlled {
  /** Fire pressed again. */
  remoteFire(world: World): void;
  /** Arrow keys while in control. */
  steer?(left: boolean, right: boolean, up: boolean, down: boolean): void;
  /**
   * The worm may use other weapons while this is active (attack from the rope): fire then goes
   * to the selected weapon instead of `remoteFire` unless the controlling weapon is selected.
   */
  readonly weaponId?: string;
  /** The turn timer ran out while still in control. */
  timeout?(world: World): void;
}

export function isRemoteControlled(e: unknown): e is RemoteControlled {
  return typeof (e as RemoteControlled | undefined)?.remoteFire === 'function';
}

export interface WeaponDef {
  id: string;
  name: string;
  /** Panel position: row 0 = utilities, 1..12 = F1..F12; column 0..4. */
  row: number;
  col: number;
  aim: AimMode;
  /** Hold fire to charge the power bar. */
  charge: boolean;
  /** Fuse (1-5 s) and bounce settings apply. */
  fuse?: boolean;
  bounce?: boolean;
  /** Shots per turn (shotgun: 2). */
  shots?: number;
  /** Retreat time override in seconds. */
  retreat?: number;
  /** False for tools that don't end the turn (girder starter pack, utilities). */
  endsTurn?: boolean;
  /** Needs open sky (air strikes): unavailable on cavern maps. */
  needsSky?: boolean;
  /** Can be fired while airborne (from a rope, parachute or jet pack). */
  airborne?: boolean;
  /** Can only be used while airborne (parachute). */
  airborneOnly?: boolean;
  /** Aimed by angle and power, but also needs a target marked first (homing weapons). */
  needsTarget?: boolean;
  /** Turn-control items handled by the game itself. */
  action?: 'skip' | 'surrender';
  /** Rejects bad targets (teleporting into rock) before anything is spent. */
  validTarget?(
    world: World,
    worm: Worm,
    target: { x: number; y: number },
    dirX: number,
    dirY: number,
  ): boolean;
  fire(ctx: FireContext): void;
}

const registry = new Map<string, WeaponDef>();

export function registerWeapon(def: WeaponDef): WeaponDef {
  registry.set(def.id, def);
  return def;
}

export function getWeapon(id: string): WeaponDef | undefined {
  return registry.get(id);
}

/** All registered weapons in panel order. */
export function allWeapons(): WeaponDef[] {
  return [...registry.values()].sort((a, b) => a.row - b.row || a.col - b.col);
}

/** Damage and size multiplier for the scheme's 1..5 power stars (3 = standard). */
export function powerScale(level: number): number {
  // Bazooka/Grenade: power 1..5 = 40/45/50/55/60 hp, power 3 is the standard 50.
  return [0.8, 0.9, 1, 1.1, 1.2][Math.min(4, Math.max(0, level - 1))] as number;
}
