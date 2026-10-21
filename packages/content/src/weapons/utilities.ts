import type { WeaponSpec } from '@wr/sim';

export const UTILITIES: WeaponSpec[] = [
  {
    id: 'lowgravity',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Низкая гравитация',
      hint: 'До конца хода прыжки выше и дольше.',
      icon: '🌙',
      row: 0,
      col: 1,
    },
    ai: { usable: false },
    view: {},
  },
  {
    id: 'fastwalk',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Быстрая ходьба',
      hint: 'До конца хода червяк бегает быстрее.',
      icon: '👟',
      row: 0,
      col: 2,
    },
    ai: { usable: false },
    view: {},
  },
  {
    id: 'laser',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Лазерный прицел',
      hint: 'Показывает линию выстрела до самой земли.',
      icon: '🔴',
      row: 0,
      col: 3,
    },
    ai: { usable: false },
    view: {},
  },
  {
    id: 'invisible',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Невидимость',
      hint: 'До конца хода червяк почти не виден.',
      icon: '👻',
      row: 0,
      col: 4,
    },
    ai: { usable: false },
    view: {},
  },
  {
    id: 'doubledamage',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Двойной урон',
      hint: 'Все взрывы до следующего хода вдвое сильнее.',
      icon: '✖️2',
      row: 0,
      col: 5,
    },
    ai: { usable: false },
    view: {},
  },
  {
    id: 'cratespy',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Шпион ящиков',
      hint: 'Показывает, что лежит в ящиках.',
      icon: '🔍',
      row: 0,
      col: 6,
    },
    ai: { usable: false },
    view: {},
  },
];
