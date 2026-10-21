import type { WeaponSpec } from '@wr/sim';

export const ARTILLERY: WeaponSpec[] = [
  {
    id: 'bazooka',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Базука',
      hint: 'Сносится ветром. Зажми пробел для силы.',
      icon: '🚀',
      row: 1,
      col: 0,
    },
    ai: { usable: true, rank: 0 },
    view: { look: 'missile' },
  },
  {
    id: 'grenade',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Граната',
      hint: 'Ветер не влияет. 1–5 — фитиль, +/− — отскок.',
      icon: '💣',
      row: 2,
      col: 0,
    },
    ai: { usable: true, rank: 1 },
    view: { look: 'grenade' },
  },
  {
    id: 'cluster',
    sim: { archetype: 'legacy' },
    ui: { name: 'Кластерная бомба', hint: 'Разлетается на осколки.', icon: '🎆', row: 2, col: 1 },
    ai: { usable: true, rank: 3 },
    view: { look: 'cluster' },
  },
];
