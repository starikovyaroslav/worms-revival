import type { SimFlags } from '../spec';
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
}

export type BehaviourName = keyof BehaviourParams;

export const BEHAVIOURS: { [K in BehaviourName]: Behaviour<BehaviourParams[K]> } = {
  longbow,
  axe,
  dragonball,
  kamikaze,
  suicide,
};

/** `sim` section of a weapon with a named behaviour. */
export type CustomSim = {
  [K in BehaviourName]: SimFlags & {
    archetype: 'custom';
    behaviour: K;
    params: BehaviourParams[K];
  };
}[BehaviourName];
