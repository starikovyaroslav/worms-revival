import type { WeaponSpec } from '@wr/sim';
import { MAX_LAUNCH } from './shared';

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
    sim: {
      archetype: 'launcher',
      aim: 'angle',
      charge: true,
      speed: MAX_LAUNCH * 0.8,
      projectile: {
        look: 'petrol',
        radius: 2.5,
        wind: 0,
        impact: 'explode',
        // A small bang (10 hp) and a lot of burning petrol.
        blast: { damage: 10, push: 0.5 },
        flames: { count: 40, speed: 2.4 },
      },
    },
    ui: {
      name: 'Бензиновая бомба',
      hint: 'Мало урона, много огня. Огонь сносит ветром.',
      icon: '🍾',
      row: 10,
      col: 0,
    },
    ai: { usable: true, rank: 15 },
    view: { look: 'petrol', sound: 'throw' },
  },
  {
    id: 'skunk',
    sim: {
      archetype: 'launcher',
      aim: 'angle',
      charge: true,
      speed: MAX_LAUNCH * 0.7,
      projectile: {
        look: 'skunk',
        radius: 3,
        wind: 0,
        impact: 'explode',
        blast: { damage: 15, push: 0.6 },
        gas: { count: 28 },
      },
    },
    ui: {
      name: 'Скунс',
      hint: 'Ядовитый газ: −5 здоровья в начале каждого хода.',
      icon: '🦨',
      row: 10,
      col: 1,
    },
    ai: { usable: true, rank: 16 },
    view: { look: 'skunk', sound: 'throw' },
  },
];
