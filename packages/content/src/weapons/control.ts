import type { WeaponSpec } from '@wr/sim';

export const CONTROL: WeaponSpec[] = [
  {
    id: 'jetpack',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Реактивный ранец',
      hint: 'Стрелки — тяга, пока есть топливо. Пробел — убрать.',
      icon: '🚀',
      row: 0,
      col: 0,
    },
    ai: { usable: false },
    view: {},
  },
  {
    id: 'girderpack',
    sim: { archetype: 'legacy' },
    ui: { name: 'Набор балок', hint: 'Пять балок за ход.', icon: '🏗️', row: 7, col: 4 },
    ai: { usable: false },
    view: {},
  },
  {
    id: 'bungee',
    sim: { archetype: 'legacy' },
    ui: { name: 'Банджи', hint: 'Упругий трос: прицепись и прыгай.', icon: '🪢', row: 8, col: 1 },
    ai: { usable: false },
    view: {},
  },
  {
    id: 'scales',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Весы правосудия',
      hint: 'Уравнивает здоровье команд.',
      icon: '⚖️',
      row: 8,
      col: 4,
    },
    ai: { usable: false },
    view: {},
  },
  {
    id: 'selectworm',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Выбор червя',
      hint: 'Клик по своему червяку: ходит он.',
      icon: '👆',
      row: 12,
      col: 2,
    },
    ai: { usable: false },
    view: {},
  },
  {
    id: 'freeze',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Заморозка',
      hint: 'Твоя команда неуязвима до следующего хода.',
      icon: '🧊',
      row: 12,
      col: 3,
    },
    ai: { usable: false },
    view: {},
  },
];
