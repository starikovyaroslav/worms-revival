import type { SimFlags } from '../spec';
import { longbow, type LongbowParams } from './longbow';
import type { Behaviour } from './types';

/** Named behaviours and the shape of their params. Add a weapon of its own here (see docs). */
export interface BehaviourParams {
  longbow: LongbowParams;
}

export type BehaviourName = keyof BehaviourParams;

export const BEHAVIOURS: { [K in BehaviourName]: Behaviour<BehaviourParams[K]> } = {
  longbow,
};

/** `sim` section of a weapon with a named behaviour. */
export type CustomSim = {
  [K in BehaviourName]: SimFlags & {
    archetype: 'custom';
    behaviour: K;
    params: BehaviourParams[K];
  };
}[BehaviourName];
