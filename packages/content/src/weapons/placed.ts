import type { WeaponSpec } from '@wr/sim';
import { TPS } from '@wr/sim';

export const PLACED: WeaponSpec[] = [
  {
    id: 'dynamite',
    sim: {
      archetype: 'placed',
      aim: 'none',
      charge: false,
      dx: 4,
      vx: 0.6,
      vy: -1,
      focus: true,
      payload: {
        kind: 'projectile',
        projectile: {
          look: 'dynamite',
          radius: 3,
          wind: 0,
          impact: 'bounce',
          fuse: 5 * TPS,
          restitution: 0.15,
          friction: 0.5,
          blast: { damage: 75 },
        },
      },
    },
    ui: { name: 'Динамит', hint: 'Положи и беги: 5 секунд.', icon: '🧨', row: 5, col: 0 },
    ai: { usable: true, rank: 13 },
    view: { look: 'dynamite' },
  },
  {
    id: 'mine',
    sim: {
      archetype: 'placed',
      aim: 'none',
      charge: false,
      dx: 6,
      vx: 0.8,
      vy: -1,
      payload: { kind: 'mine', armTicks: 2 * TPS, fuseTicks: 3 * TPS, dudsAllowed: false },
    },
    ui: { name: 'Мина', hint: 'Взводится через 2 секунды.', icon: '⚫', row: 5, col: 1 },
    ai: { usable: false },
    view: {},
  },
];
