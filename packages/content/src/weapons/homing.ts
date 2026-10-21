import type { WeaponSpec } from '@wr/sim';

export const HOMING: WeaponSpec[] = [
  {
    id: 'homing',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Самонаводящаяся ракета',
      hint: 'Клик — отметить цель, затем стреляй как из базуки.',
      icon: '🎯',
      row: 1,
      col: 1,
    },
    ai: { usable: false },
    view: { look: 'homing' },
  },
  {
    id: 'mortar',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Миномёт',
      hint: 'Всегда на полной силе. Разлетается осколками.',
      icon: '🧯',
      row: 1,
      col: 2,
    },
    ai: { usable: true, rank: 2 },
    view: { look: 'mortar' },
  },
  {
    id: 'pigeon',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Почтовый голубь',
      hint: 'Клик по цели — голубь сам облетит препятствия.',
      icon: '🕊️',
      row: 1,
      col: 3,
    },
    ai: { usable: true, rank: 6 },
    view: {},
  },
];
