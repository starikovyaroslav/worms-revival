import type { WeaponSpec } from '@wr/sim';

export const GUNS: WeaponSpec[] = [
  {
    id: 'handgun',
    sim: { archetype: 'legacy' },
    ui: { name: 'Пистолет', hint: 'Шесть метких выстрелов.', icon: '🔫', row: 3, col: 1 },
    ai: { usable: true, rank: 9 },
    view: {},
  },
  {
    id: 'uzi',
    sim: { archetype: 'legacy' },
    ui: { name: 'Узи', hint: 'Очередь. Стрелками можно вести прицел.', icon: '💨', row: 3, col: 2 },
    ai: { usable: true, rank: 8 },
    view: {},
  },
  {
    id: 'minigun',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Миниган',
      hint: 'Длинная очередь с сильным отбросом.',
      icon: '🌀',
      row: 3,
      col: 3,
    },
    ai: { usable: false },
    view: {},
  },
  {
    id: 'longbow',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Длинный лук',
      hint: 'Две стрелы. Стрелы втыкаются в землю — по ним можно ходить.',
      icon: '🏹',
      row: 3,
      col: 4,
    },
    ai: { usable: true, rank: 10 },
    view: {},
  },
];
