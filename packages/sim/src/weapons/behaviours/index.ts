import type { SimFlags } from '../spec';
import {
  freeze,
  girder,
  scales,
  selectworm,
  teleport,
  type GirderParams,
  type SelectWormParams,
} from './control';
import { armageddon, earthquake, nuke, type ArmageddonParams, type NukeParams } from './disasters';
import { donkey, type DonkeyParams } from './donkey';
import {
  flamethrower,
  homing,
  mortar,
  pigeon,
  type FlamethrowerParams,
  type HomingParams,
  type MortarParams,
  type PigeonParams,
} from './homing';
import { longbow, type LongbowParams } from './longbow';
import {
  axe,
  dragonball,
  kamikaze,
  suicide,
  type AxeParams,
  type DragonballParams,
  type KamikazeParams,
  type SuicideParams,
} from './melee';
import type { Behaviour } from './types';

/** Named behaviours and the shape of their params. Add a weapon of its own here (see docs). */
export interface BehaviourParams {
  longbow: LongbowParams;
  axe: AxeParams;
  dragonball: DragonballParams;
  kamikaze: KamikazeParams;
  suicide: SuicideParams;
  donkey: DonkeyParams;
  homing: HomingParams;
  mortar: MortarParams;
  pigeon: PigeonParams;
  flamethrower: FlamethrowerParams;
  earthquake: Record<string, never>;
  armageddon: ArmageddonParams;
  nuke: NukeParams;
  girder: GirderParams;
  teleport: Record<string, never>;
  scales: Record<string, never>;
  freeze: Record<string, never>;
  selectworm: SelectWormParams;
}

export type BehaviourName = keyof BehaviourParams;

export const BEHAVIOURS: { [K in BehaviourName]: Behaviour<BehaviourParams[K]> } = {
  longbow,
  axe,
  dragonball,
  kamikaze,
  suicide,
  donkey,
  homing,
  mortar,
  pigeon,
  flamethrower,
  earthquake,
  armageddon,
  nuke,
  girder,
  teleport,
  scales,
  freeze,
  selectworm,
};

/** `sim` section of a weapon with a named behaviour. */
export type CustomSim = {
  [K in BehaviourName]: SimFlags & {
    archetype: 'custom';
    behaviour: K;
    params: BehaviourParams[K];
  };
}[BehaviourName];
