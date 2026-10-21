import type { WeaponSpec } from '@wr/sim';
import { MAX_LAUNCH } from './shared';
import { TPS } from '@wr/sim';

export const HOMING: WeaponSpec[] = [
  {
    id: 'homing',
    sim: {
      archetype: 'custom',
      behaviour: 'homing',
      aim: 'angle',
      charge: true,
      needsTarget: true,
      params: {
        // Full power lets it lock on 546 px above the ground when fired straight up (worms2d.info).
        speed: 24.3,
        projectile: {
          look: 'homing',
          radius: 2,
          wind: 0,
          impact: 'explode',
          fuse: 10 * TPS,
          blast: { damage: 50 },
        },
        armTicks: 25,
        lockEndTick: 4 * TPS,
        pull: 2.2,
        maxSpeed: 24,
      },
    },
    ui: {
      name: 'Самонаводящаяся ракета',
      hint: 'Клик — отметить цель, затем стреляй как из базуки.',
      icon: '🎯',
      row: 1,
      col: 1,
    },
    ai: { usable: false },
    view: { look: 'homing', sound: 'launch' },
  },
  {
    id: 'mortar',
    sim: {
      archetype: 'custom',
      behaviour: 'mortar',
      aim: 'angle',
      charge: false,
      params: {
        // Always fired at full power: only the angle matters.
        speed: MAX_LAUNCH,
        // By power level (worms2d.info): bomblets, damage and crater diameter, for the shell and each bomblet.
        levels: [
          { clusters: 4, damage: 12, diameter: 23 },
          { clusters: 4, damage: 13, diameter: 23 },
          { clusters: 5, damage: 15, diameter: 35 },
          { clusters: 5, damage: 16, diameter: 35 },
          { clusters: 6, damage: 18, diameter: 35 },
        ],
        shell: { look: 'mortar', radius: 2.5, wind: 0 },
        bomblet: { look: 'clusterlet', radius: 2, wind: 0 },
        scatter: { minSpeed: 2, maxSpeed: 4, spread: 0.9 },
        upgrade: { name: 'clusters', extra: 3 },
      },
    },
    ui: {
      name: 'Миномёт',
      hint: 'Всегда на полной силе. Разлетается осколками.',
      icon: '🧯',
      row: 1,
      col: 2,
    },
    ai: { usable: true, rank: 2 },
    view: { look: 'mortar', sound: 'launch' },
  },
  {
    id: 'pigeon',
    sim: {
      archetype: 'custom',
      behaviour: 'pigeon',
      aim: 'target',
      charge: false,
      params: { offsetX: 8, offsetY: -6, blast: { damage: 75 } },
    },
    ui: {
      name: 'Почтовый голубь',
      hint: 'Клик по цели — голубь сам облетит препятствия.',
      icon: '🕊️',
      row: 1,
      col: 3,
    },
    ai: { usable: true, rank: 6 },
    view: { sound: 'throw' },
  },
];
