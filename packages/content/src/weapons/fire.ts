import type { WeaponSpec } from '@wr/sim';

export const FIRE: WeaponSpec[] = [
  {
    id: 'flamethrower',
    sim: { archetype: 'legacy' },
    ui: { name: 'Огнемёт', hint: 'Длинная струя горящего напалма.', icon: '🔥', row: 9, col: 2 },
    ai: { usable: true, rank: 18 },
    view: {},
  },
  {
    id: 'petrol',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Бензиновая бомба',
      hint: 'Мало урона, много огня. Огонь сносит ветром.',
      icon: '🍾',
      row: 10,
      col: 0,
    },
    ai: { usable: true, rank: 15 },
    view: { look: 'petrol' },
  },
  {
    id: 'skunk',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Скунс',
      hint: 'Ядовитый газ: −5 здоровья в начале каждого хода.',
      icon: '🦨',
      row: 10,
      col: 1,
    },
    ai: { usable: true, rank: 16 },
    view: { look: 'skunk' },
  },
];
