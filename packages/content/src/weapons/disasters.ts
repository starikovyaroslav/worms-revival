import type { WeaponSpec } from '@wr/sim';

export const DISASTERS: WeaponSpec[] = [
  {
    id: 'earthquake',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Землетрясение',
      hint: 'Трясёт всю карту и подбрасывает всех.',
      icon: '🌍',
      row: 2,
      col: 4,
    },
    ai: { usable: false },
    view: {},
  },
  {
    id: 'superbanana',
    sim: { archetype: 'legacy' },
    ui: { name: 'Супер-банан', hint: 'Бананы раскалываются ещё раз.', icon: '🍌', row: 9, col: 0 },
    ai: { usable: true, rank: 19 },
    view: { look: 'banana' },
  },
  {
    id: 'vase',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Бесценная ваза Мин',
      hint: 'Разбивается на острые осколки.',
      icon: '🏺',
      row: 10,
      col: 2,
    },
    ai: { usable: true, rank: 21 },
    view: { look: 'vase' },
  },
  {
    id: 'nuke',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Индийское ядерное испытание',
      hint: 'Отравляет всех, поднимает воду.',
      icon: '☢️',
      row: 11,
      col: 3,
    },
    ai: { usable: false },
    view: {},
  },
  {
    id: 'armageddon',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Армагеддон',
      hint: 'Метеоритный дождь по всей карте.',
      icon: '☄️',
      row: 11,
      col: 4,
    },
    ai: { usable: false },
    view: { look: 'meteor' },
  },
  {
    id: 'magicbullet',
    sim: { archetype: 'legacy' },
    ui: {
      name: 'Волшебная пуля Патси',
      hint: 'Клик — цель. Пуля найдёт дорогу сама.',
      icon: '✨',
      row: 12,
      col: 4,
    },
    ai: { usable: false },
    view: { look: 'bullet' },
  },
];
