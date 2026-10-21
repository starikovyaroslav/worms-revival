import { Ruleset, type WeaponSpec } from '@wr/sim';
import { ANIMALS } from './animals';
import { ARTILLERY } from './artillery';
import { CONTROL } from './control';
import { DISASTERS } from './disasters';
import { FIRE } from './fire';
import { GUNS } from './guns';
import { HOMING } from './homing';
import { LOOKS } from './looks';
import { MELEE } from './melee';
import { PLACED } from './placed';
import { THROWN_AND_SHEEP } from './specials';
import { STRIKES } from './strikes';
import { TOOLS } from './tools';
import { UTILITIES } from './utilities';

export { LOOKS } from './looks';

/** Every weapon of the game, in panel order (row, then column). */
export const WEAPONS: readonly WeaponSpec[] = [
  ...ARTILLERY,
  ...HOMING,
  ...FIRE,
  ...THROWN_AND_SHEEP,
  ...GUNS,
  ...MELEE,
  ...PLACED,
  ...ANIMALS,
  ...STRIKES,
  ...DISASTERS,
  ...CONTROL,
  ...UTILITIES,
  ...TOOLS,
].sort((a, b) => a.ui.row - b.ui.row || a.ui.col - b.ui.col);

/** The rules every real match is played by; `buildGameSetup` hands it to the game. */
export const RULESET = new Ruleset(WEAPONS, LOOKS);

/** Localised names and panel icons for weapons. */
export interface WeaponInfo {
  name: string;
  icon: string;
  hint: string;
}

export const PANEL_ROWS = [
  'Util',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
];

export function weaponInfo(id: string): WeaponInfo {
  return RULESET.get(id)?.spec.ui ?? { name: id, icon: '❔', hint: '' };
}
