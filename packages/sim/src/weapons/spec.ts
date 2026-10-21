import type { LauncherSim } from './archetypes/launcher';
import type { WeaponRules } from './weapon';

/*
 * One definition per weapon (see docs/design/adding-a-weapon.md). The TYPES live here, in sim; the
 * DATA lives in packages/content/src/weapons and is handed to the game as a `Ruleset`
 * (sim never imports content). A spec has four sections:
 *   sim  - what the weapon does: flags plus an archetype with its numbers (compiled into a WeaponDef),
 *   ui   - how the panel shows it (names are Russian, row/col is the panel cell),
 *   ai   - whether and how the computer players use it,
 *   view - which look the renderer draws and which sound goes with the shot.
 */

/** Visual identifiers of projectiles, shared by sim (what is spawned) and render (how it is drawn). */
export type Look =
  | 'banana'
  | 'bananalet'
  | 'bullet'
  | 'carpet'
  | 'cluster'
  | 'clusterlet'
  | 'dragonball'
  | 'dynamite'
  | 'frenchsheep'
  | 'grenade'
  | 'hhg'
  | 'homing'
  | 'letter'
  | 'mbbomb'
  | 'meteor'
  | 'missile'
  | 'mortar'
  | 'napalm'
  | 'petrol'
  | 'shard'
  | 'skunk'
  | 'vase';

/** Animals (render only; the entity is always a Sheep). */
export type AnimalLook = 'sheep' | 'mole' | 'cow' | 'oldwoman' | 'nun';

/** Sound ids carried by `sound` events; the audio engine has a synth for each. */
export type SoundId =
  | 'explosion'
  | 'splash'
  | 'shotgun'
  | 'shot'
  | 'launch'
  | 'throw'
  | 'bounce'
  | 'worm-bounce'
  | 'fall-hurt'
  | 'punch'
  | 'bat'
  | 'prod'
  | 'swish'
  | 'mine-beep'
  | 'dud'
  | 'baa'
  | 'sheep-fly'
  | 'hallelujah'
  | 'collect'
  | 'rope-shoot'
  | 'rope-attach'
  | 'rope-miss'
  | 'parachute'
  | 'teleport'
  | 'girder'
  | 'torch'
  | 'drill'
  | 'airstrike'
  | 'quake'
  | 'jet'
  | 'flame'
  | 'cough'
  | 'nope'
  | 'tick'
  | 'turn-start'
  | 'charge';

export interface UiSpec {
  /** Display name (Russian). */
  name: string;
  hint: string;
  /** Emoji used as the panel icon. */
  icon: string;
  /** Panel position: row 0 = utilities, 1..12 = F1..F12. */
  row: number;
  col: number;
}

export interface AiSpec {
  /** Whether the computer players ever pick this weapon. */
  usable: boolean;
  /**
   * Preference order among the usable weapons (lower = earlier); weaker bots only consider the first
   * few. Required when `usable`.
   */
  rank?: number;
  /**
   * Weapons with no aiming and a limited reach: the bot only tries them when an enemy is within `dx`
   * px horizontally and `dy` vertically. Default for other no-aim weapons: a melee swing.
   */
  reach?: { dx: number; dy: number };
}

export interface ViewSpec {
  /** What the renderer draws for the thing this weapon spawns (omitted: nothing of its own). */
  look?: Look | AnimalLook;
  /** Sound played when the weapon goes off. */
  sound?: SoundId;
}

/** How a look glows and what it leaves behind while flying. */
export interface LookSpec {
  light?: { color: number; radius: number; intensity: number; flicker?: number };
  /** 'rocket': smoke all the time; 'fuse': sparks while the fuse burns. */
  trail?: 'rocket' | 'fuse';
}

/** Where a weapon lives besides the scheme tables. */
export type Listing =
  /** Appears in the schemes (the default). */
  | 'scheme'
  /** Deliberately in no scheme's weapon table: only from crates or special schemes. */
  | 'unlisted';

export interface WeaponSpec {
  id: string;
  sim: SimSpec;
  ui: UiSpec;
  ai: AiSpec;
  view: ViewSpec;
  listing?: Listing;
}

/** The flags every weapon declares (see WeaponRules for what they mean). */
export type SimFlags = Omit<WeaponRules, 'fire' | 'validTarget'>;

/** Transitional: not migrated to an archetype yet, the definition is still code in sim. */
export interface LegacySim {
  archetype: 'legacy';
}

/**
 * Code in the spec itself: for tests and prototypes. Not hashable and not serializable, so real
 * weapons use an archetype (or a named `custom` behaviour) instead.
 */
export interface InlineSim extends SimFlags {
  archetype: 'inline';
  fire: WeaponRules['fire'];
  validTarget?: WeaponRules['validTarget'];
}

export type SimSpec = LegacySim | InlineSim | LauncherSim;
