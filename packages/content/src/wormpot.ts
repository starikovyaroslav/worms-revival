import type { Scheme } from '@wr/sim';

/** A Wormpot modifier: a twist applied on top of the chosen scheme. */
export interface WormpotMod {
  id: string;
  icon: string;
  name: string;
  description: string;
  apply(s: Scheme): Scheme;
}

const mapWeapons = (
  s: Scheme,
  fn: (id: string, w: Scheme['weapons'][string]) => Scheme['weapons'][string],
) => ({
  ...s,
  weapons: Object.fromEntries(Object.entries(s.weapons).map(([id, w]) => [id, fn(id, w)])),
});

export const WORMPOT: WormpotMod[] = [
  {
    id: 'lowgrav',
    icon: '🌙',
    name: 'Низкая гравитация',
    description: 'Всё летает вдвое дальше.',
    apply: (s) => ({ ...s, physics: { ...s.physics, gravity: 0.11 } }),
  },
  {
    id: 'double',
    icon: '💥',
    name: 'Двойной урон',
    description: 'Все взрывы наносят вдвое больше урона.',
    apply: (s) => ({ ...s, physics: { ...s.physics, damageScale: 2 } }),
  },
  {
    id: 'hurricane',
    icon: '🌪️',
    name: 'Ураган',
    description: 'Ветер в два раза сильнее.',
    apply: (s) => ({ ...s, wind: 1, physics: { ...s.physics, maxWind: 0.1 } }),
  },
  {
    id: 'calm',
    icon: '🍃',
    name: 'Штиль',
    description: 'Никакого ветра.',
    apply: (s) => ({ ...s, wind: 0 }),
  },
  {
    id: 'tanks',
    icon: '🛡️',
    name: 'Толстокожие',
    description: '200 здоровья у каждого червяка.',
    apply: (s) => ({ ...s, wormHealth: 200 }),
  },
  {
    id: 'fragile',
    icon: '🥚',
    name: 'Хрупкие',
    description: 'Всего 30 здоровья.',
    apply: (s) => ({ ...s, wormHealth: 30 }),
  },
  {
    id: 'cratestorm',
    icon: '📦',
    name: 'Ящикопад',
    description: 'Ящик каждый ход.',
    apply: (s) => ({ ...s, crateChance: 100 }),
  },
  {
    id: 'sheepheaven',
    icon: '🐑',
    name: 'Овечий рай',
    description: 'В ящиках почти одни овцы.',
    apply: (s) => ({
      ...s,
      crateChance: Math.max(s.crateChance, 60),
      healthCrateShare: 0.15,
      weapons: {
        ...s.weapons,
        sheep: { ammo: 1, power: 3, delay: 0, ...s.weapons.sheep, crate: 20 },
        supersheep: { ammo: 0, power: 3, delay: 0, ...s.weapons.supersheep, crate: 10 },
      },
    }),
  },
  {
    id: 'minefield',
    icon: '💣',
    name: 'Минное поле',
    description: 'Мины и бочки повсюду.',
    apply: (s) => ({ ...s, mines: 24, barrels: 10 }),
  },
  {
    id: 'quick',
    icon: '⏱️',
    name: 'Блиц',
    description: 'Ходы по 15 секунд.',
    apply: (s) => ({ ...s, turnTime: 15, hotSeatTime: Math.min(s.hotSeatTime, 3) }),
  },
  {
    id: 'artillery',
    icon: '🎯',
    name: 'Артиллерия',
    description: 'Червяки не могут ходить. Только меткость.',
    apply: (s) => ({ ...s, artillery: true }),
  },
  {
    id: 'featherfall',
    icon: '🪶',
    name: 'Мягкая посадка',
    description: 'Никакого урона от падений.',
    apply: (s) => ({ ...s, fallDamage: false }),
  },
  {
    id: 'upgrades',
    icon: '⭐',
    name: 'Апгрейды',
    description: 'Улучшенные гранаты, дробовик, кластеры и Аква-овца.',
    apply: (s) => ({
      ...s,
      upgrades: { grenade: true, shotgun: true, clusters: true, longbow: true, aquaSheep: true },
    }),
  },
  {
    id: 'superweapons',
    icon: '✝️',
    name: 'Супероружие',
    description: 'Святые гранаты, бананы и супер-овцы сразу и по две.',
    apply: (s) => ({
      ...s,
      weapons: {
        ...s.weapons,
        hhg: { power: 3, crate: 1, ...s.weapons.hhg, ammo: 2, delay: 0 },
        banana: { power: 3, crate: 1, ...s.weapons.banana, ammo: 2, delay: 0 },
        supersheep: { power: 3, crate: 1, ...s.weapons.supersheep, ammo: 2, delay: 0 },
      },
    }),
  },
  {
    id: 'bigbang',
    icon: '☄️',
    name: 'Большой бабах',
    description: 'Всё оружие на звезду мощнее.',
    apply: (s) => mapWeapons(s, (_, w) => ({ ...w, power: Math.min(5, w.power + 1) })),
  },
];

export function applyWormpot(scheme: Scheme, ids: readonly string[]): Scheme {
  return ids.reduce((s, id) => WORMPOT.find((m) => m.id === id)?.apply(s) ?? s, scheme);
}
