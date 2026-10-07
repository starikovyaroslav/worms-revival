/** Localised names and panel icons for weapons. */
export interface WeaponInfo {
  name: string;
  icon: string;
  hint: string;
}

export const WEAPON_INFO: Record<string, WeaponInfo> = {
  bazooka: { name: 'Базука', icon: '🚀', hint: 'Сносится ветром. Зажми пробел для силы.' },
  grenade: { name: 'Граната', icon: '💣', hint: 'Ветер не влияет. 1–5 — фитиль, +/− — отскок.' },
  cluster: { name: 'Кластерная бомба', icon: '🎆', hint: 'Разлетается на осколки.' },
  banana: { name: 'Банановая бомба', icon: '🍌', hint: 'Пять бананов разрушения.' },
  shotgun: { name: 'Дробовик', icon: '🔫', hint: 'Два выстрела за ход.' },
  firepunch: { name: 'Огненный удар', icon: '🔥', hint: 'Апперкот, пробивающий землю вверх.' },
  prod: { name: 'Тычок', icon: '👉', hint: 'Без урона. Идеально, чтобы столкнуть в воду.' },
  dynamite: { name: 'Динамит', icon: '🧨', hint: 'Положи и беги: 5 секунд.' },
  mine: { name: 'Мина', icon: '⚫', hint: 'Взводится через 2 секунды.' },
  sheep: { name: 'Овца', icon: '🐑', hint: 'Пробел ещё раз — бабах.' },
  supersheep: {
    name: 'Супер-овца',
    icon: '🦸',
    hint: 'Пробел — взлёт, стрелки — руль, пробел — бабах.',
  },
  airstrike: { name: 'Авиаудар', icon: '✈️', hint: 'Клик по цели. Не работает в пещерах.' },
  blowtorch: { name: 'Паяльная лампа', icon: '🔦', hint: 'Прожигает тоннель. Пробел — стоп.' },
  drill: { name: 'Отбойный молоток', icon: '⛏️', hint: 'Копает вниз. Пробел — стоп.' },
  girder: { name: 'Балка', icon: '🏗️', hint: 'Клик — поставить, вверх/вниз — наклон.' },
  bat: { name: 'Бейсбольная бита', icon: '🏏', hint: 'Хоумран в воду.' },
  rope: {
    name: 'Ниндзя-верёвка',
    icon: '🪢',
    hint: 'Стрелки — качаться и лезть, пробел — отпустить.',
  },
  parachute: { name: 'Парашют', icon: '🪂', hint: 'Открывается в воздухе. Сносится ветром.' },
  teleport: { name: 'Телепорт', icon: '✨', hint: 'Клик по свободному месту.' },
  hhg: { name: 'Святая граната', icon: '✝️', hint: 'Аллилуйя! Взрывается, только остановившись.' },
  skipgo: { name: 'Пропуск хода', icon: '⏭️', hint: 'Ничего не делать.' },
  surrender: { name: 'Сдаться', icon: '🏳️', hint: 'Команда покидает поле боя.' },
};

export const PANEL_ROWS = [
  'Util',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
];

export function weaponInfo(id: string): WeaponInfo {
  return WEAPON_INFO[id] ?? { name: id, icon: '❔', hint: '' };
}
