import type { WeaponSpec } from '@wr/sim';

export const THROWN_AND_SHEEP: WeaponSpec[] = [
  {
    id: 'banana',
    sim: { archetype: 'legacy' },
    ui: { name: 'Банановая бомба', hint: 'Пять бананов разрушения.', icon: '🍌', row: 2, col: 2 },
    ai: { usable: true, rank: 4 },
    view: { look: 'banana' },
  },
  {
    id: 'sheep',
    sim: { archetype: 'legacy' },
    ui: { name: 'Овца', hint: 'Пробел ещё раз — бабах.', icon: '🐑', row: 5, col: 2 },
    ai: { usable: false },
    view: { look: 'sheep' },
  },
  {
    id: 'supersheep',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Супер-овца',
      hint: 'Пробел — взлёт, стрелки — руль, пробел — бабах.',
      icon: '🦸',
      row: 5,
      col: 3,
    },
    ai: { usable: false },
    view: { look: 'sheep' },
  },
  {
    id: 'hhg',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Святая граната',
      hint: 'Аллилуйя! Взрывается, только остановившись.',
      icon: '✝️',
      row: 9,
      col: 1,
    },
    ai: { usable: true, rank: 5 },
    view: { look: 'hhg' },
  },
];
