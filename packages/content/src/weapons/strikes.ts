import type { WeaponSpec } from '@wr/sim';

export const STRIKES: WeaponSpec[] = [
  {
    id: 'airstrike',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Авиаудар',
      hint: 'Клик по цели. Не работает в пещерах.',
      icon: '✈️',
      row: 6,
      col: 0,
    },
    ai: { usable: true, rank: 14 },
    view: { look: 'missile' },
  },
  {
    id: 'napalm',
    sim: { archetype: 'legacy' },
    ui: { name: 'Напалм', hint: 'Клик по цели. Огонь сносит ветром.', icon: '🌋', row: 6, col: 1 },
    ai: { usable: true, rank: 22 },
    view: { look: 'napalm' },
  },
  {
    id: 'mail',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Почтовый налёт',
      hint: 'Письма планируют и сносятся ветром.',
      icon: '✉️',
      row: 6,
      col: 2,
    },
    ai: { usable: true, rank: 23 },
    view: { look: 'letter' },
  },
  {
    id: 'minestrike',
    sim: { archetype: 'legacy' },
    ui: { name: 'Налёт мин', hint: 'Пять мин падают с неба.', icon: '💥', row: 6, col: 3 },
    ai: { usable: true, rank: 24 },
    view: {},
  },
  {
    id: 'frenchsheep',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Французский налёт овец',
      hint: 'Горящие овцы с неба.',
      icon: '🐑',
      row: 10,
      col: 3,
    },
    ai: { usable: true, rank: 26 },
    view: { look: 'frenchsheep' },
  },
  {
    id: 'carpet',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Ковровая бомбардировка',
      hint: 'Длинная цепочка бомб вдоль линии полёта.',
      icon: '🧨',
      row: 10,
      col: 4,
    },
    ai: { usable: true, rank: 25 },
    view: { look: 'carpet' },
  },
];
