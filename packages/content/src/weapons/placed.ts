import type { WeaponSpec } from '@wr/sim';

export const PLACED: WeaponSpec[] = [
  {
    id: 'dynamite',
    sim: { archetype: 'legacy' },
    ui: { name: 'Динамит', hint: 'Положи и беги: 5 секунд.', icon: '🧨', row: 5, col: 0 },
    ai: { usable: true, rank: 13 },
    view: { look: 'dynamite' },
  },
  {
    id: 'mine',
    sim: { archetype: 'legacy' },
    ui: { name: 'Мина', hint: 'Взводится через 2 секунды.', icon: '⚫', row: 5, col: 1 },
    ai: { usable: false },
    view: {},
  },
];
