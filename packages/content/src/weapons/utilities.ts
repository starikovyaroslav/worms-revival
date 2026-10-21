import type { UtilitySim, WeaponSpec } from '@wr/sim';

/** Utilities switch a flag on for the rest of the turn: usable once per turn, do not end it. */
const utility = (effect: UtilitySim['effect']): UtilitySim => ({
  archetype: 'utility',
  effect,
  aim: 'none',
  charge: false,
  endsTurn: false,
  oncePerTurn: true,
});

export const UTILITIES: WeaponSpec[] = [
  {
    id: 'lowgravity',
    sim: utility('lowGravity'),
    ui: {
      name: 'Низкая гравитация',
      hint: 'До конца хода прыжки выше и дольше.',
      icon: '🌙',
      row: 0,
      col: 1,
    },
    ai: { usable: false },
    view: { sound: 'collect' },
  },
  {
    id: 'fastwalk',
    sim: utility('fastWalk'),
    ui: {
      name: 'Быстрая ходьба',
      hint: 'До конца хода червяк бегает быстрее.',
      icon: '👟',
      row: 0,
      col: 2,
    },
    ai: { usable: false },
    view: { sound: 'collect' },
  },
  {
    id: 'laser',
    sim: utility('laser'),
    ui: {
      name: 'Лазерный прицел',
      hint: 'Показывает линию выстрела до самой земли.',
      icon: '🔴',
      row: 0,
      col: 3,
    },
    ai: { usable: false },
    view: { sound: 'collect' },
  },
  {
    id: 'invisible',
    sim: utility('invisible'),
    ui: {
      name: 'Невидимость',
      hint: 'До конца хода червяк почти не виден.',
      icon: '👻',
      row: 0,
      col: 4,
    },
    ai: { usable: false },
    view: { sound: 'collect' },
  },
  {
    id: 'doubledamage',
    sim: utility('doubleDamage'),
    ui: {
      name: 'Двойной урон',
      hint: 'Все взрывы до следующего хода вдвое сильнее.',
      icon: '✖️2',
      row: 0,
      col: 5,
    },
    ai: { usable: false },
    view: { sound: 'collect' },
  },
  {
    id: 'cratespy',
    sim: utility('crateSpy'),
    ui: {
      name: 'Шпион ящиков',
      hint: 'Показывает, что лежит в ящиках.',
      icon: '🔍',
      row: 0,
      col: 6,
    },
    ai: { usable: false },
    view: { sound: 'collect' },
  },
];
