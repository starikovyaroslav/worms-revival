import type { WeaponSpec } from '@wr/sim';
import { TPS } from '@wr/sim';
import { MAX_LAUNCH, BOUNCE } from './shared';

export const THROWN_AND_SHEEP: WeaponSpec[] = [
  {
    id: 'banana',
    sim: {
      archetype: 'launcher',
      aim: 'angle',
      charge: true,
      fuse: true,
      bounce: true,
      speed: MAX_LAUNCH,
      projectile: {
        look: 'banana',
        radius: 3,
        wind: 0,
        impact: 'bounce',
        fuse: 'player',
        restitution: BOUNCE,
        blast: { damage: 75 },
        cluster: {
          count: 5,
          minSpeed: 3.5,
          maxSpeed: 7,
          spread: 0.7,
          projectile: {
            look: 'bananalet',
            radius: 2.5,
            wind: 0,
            impact: 'explode',
            blast: { damage: 75 },
          },
        },
      },
    },
    ui: { name: 'Банановая бомба', hint: 'Пять бананов разрушения.', icon: '🍌', row: 2, col: 2 },
    ai: { usable: true, rank: 4 },
    view: { look: 'banana', sound: 'throw' },
  },
  {
    id: 'sheep',
    sim: { archetype: 'legacy' },
    ui: { name: 'Овца', hint: 'Пробел ещё раз — бабах.', icon: '🐑', row: 5, col: 2 },
    ai: { usable: false },
    view: { look: 'sheep' },
  },
  {
    id: 'supersheep',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Супер-овца',
      hint: 'Пробел — взлёт, стрелки — руль, пробел — бабах.',
      icon: '🦸',
      row: 5,
      col: 3,
    },
    ai: { usable: false },
    view: { look: 'sheep' },
  },
  {
    id: 'hhg',
    sim: {
      archetype: 'launcher',
      aim: 'angle',
      charge: true,
      speed: MAX_LAUNCH,
      projectile: {
        look: 'hhg',
        radius: 3.5,
        wind: 0,
        impact: 'bounce',
        // Fixed three second fuse, minimum bounce, waits until it stops.
        fuse: 3 * TPS,
        restitution: BOUNCE.low,
        friction: 0.8,
        waitForRest: true,
        preSound: { id: 'hallelujah', ticks: 60 },
        blast: { damage: 100, push: 1.3 },
      },
    },
    ui: {
      name: 'Святая граната',
      hint: 'Аллилуйя! Взрывается, только остановившись.',
      icon: '✝️',
      row: 9,
      col: 1,
    },
    ai: { usable: true, rank: 5 },
    view: { look: 'hhg', sound: 'throw' },
  },
];
