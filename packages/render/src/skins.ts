/** Cosmetic identities only: never imported by simulation or used for movement/collision rules. */
export const SKINS = [
  { id: 'brutal', name: 'Брутальный', profile: 'heavy', sheet: 'v1' },
  { id: 'soft', name: 'Мягкотелый', profile: 'soft', sheet: 'v1' },
  { id: 'glam-femme', name: 'Гламурная дива', profile: 'glam', sheet: 'v1' },
  { id: 'glam-masc', name: 'Гламурный красавчик', profile: 'glam', sheet: 'v1' },
  { id: 'elder', name: 'Старый ворчун', profile: 'elder', sheet: 'v1' },
  { id: 'sickly', name: 'Больной', profile: 'sick', sheet: 'v1' },
  { id: 'veteran', name: 'Потрёпанный ветеран', profile: 'veteran', sheet: 'v1' },
  { id: 'classic', name: 'Классический нахал', profile: 'classic', sheet: 'v1' },
  { id: 'commando-femme', name: 'Брутальная коммандо', profile: 'heavy', sheet: 'v2' },
  { id: 'soft-femme', name: 'Мягкотелая героиня', profile: 'soft', sheet: 'v2' },
  { id: 'dominatrix', name: 'Доминатрикс', profile: 'dominant', sheet: 'v2' },
  { id: 'glam-rocker', name: 'Гламурный рокер', profile: 'glam', sheet: 'v2' },
  { id: 'elder-femme', name: 'Старая ворчунья', profile: 'elder', sheet: 'v2' },
  { id: 'sickly-femme', name: 'Больная героиня', profile: 'sick', sheet: 'v2' },
  { id: 'veteran-femme', name: 'Потрёпанная ветеранка', profile: 'veteran', sheet: 'v2' },
  { id: 'classic-femme', name: 'Классическая нахалка', profile: 'classic', sheet: 'v2' },
  { id: 'commander-femme', name: 'Чёрная командирша', profile: 'dominant', sheet: 'v2' },
] as const;
export type SkinId = (typeof SKINS)[number]['id'];
export type SkinProfile = (typeof SKINS)[number]['profile'];
export const SKIN_POSES = [
  'idle',
  'blink',
  'walk_0',
  'walk_1',
  'walk_2',
  'walk_3',
  'jump',
  'fall',
  'land',
  'hurt',
  'aim',
  'throw',
  'melee',
  'rope',
  'defeat',
  'win',
] as const;
export type SkinPose = (typeof SKIN_POSES)[number];
export function skinById(id: unknown) {
  return SKINS.find((skin) => skin.id === id);
}
/** A class is a family of distinct identities, not a single recolored actor. */
export const CHARACTER_CLASSES = [
  { id: 'heavy', name: 'Брутальные' },
  { id: 'soft', name: 'Мягкотелые' },
  { id: 'glam', name: 'Гламурные' },
  { id: 'dominant', name: 'Доминатрикс' },
  { id: 'elder', name: 'Пожилые' },
  { id: 'sick', name: 'Больные' },
  { id: 'veteran', name: 'Ветераны' },
  { id: 'classic', name: 'Классические' },
] as const;
export type CharacterClassId = (typeof CHARACTER_CLASSES)[number]['id'];
export interface CharacterAppearance {
  characterClass?: string;
  /** Explicit identity per team member; absent entries use the class's round-robin roster. */
  characterVariants?: readonly string[];
  /** Backwards-compatible appearance from early development/replays. */
  skin?: string;
}
export function variantsForClass(id: string) {
  return SKINS.filter((skin) => id === 'mixed' || skin.profile === id);
}
export function appearanceClass(appearance: CharacterAppearance): string {
  return (
    appearance.characterClass ??
    (appearance.skin === 'mixed' ? 'mixed' : (skinById(appearance.skin)?.profile ?? 'legacy'))
  );
}
/** Stable member assignment; unknown/unavailable classes never silently become a different class. */
export function resolveTeamVariant(
  appearance: CharacterAppearance,
  member: number,
  available: ReadonlySet<string>,
): SkinId | undefined {
  if (!appearance.characterClass && skinById(appearance.skin))
    return available.has(appearance.skin!) ? (appearance.skin as SkinId) : undefined;
  const family = appearanceClass(appearance);
  const pool = variantsForClass(family).filter((skin) => available.has(skin.id));
  const explicit = appearance.characterVariants?.[member];
  if (explicit && pool.some((skin) => skin.id === explicit)) return explicit as SkinId;
  return pool.length ? pool[Math.max(0, member) % pool.length]!.id : undefined;
}
/** Appearance-only breathing and settling; all profiles travel at the simulation's SAME speed. */
export const SKIN_MOTION: Record<
  SkinProfile,
  { breathe: number; bob: number; lean: number; recoil: number }
> = {
  heavy: { breathe: 1.6, bob: 0.22, lean: 0.015, recoil: 0.3 },
  soft: { breathe: 2, bob: 0.65, lean: 0.03, recoil: 0.9 },
  glam: { breathe: 1.9, bob: 0.3, lean: 0.022, recoil: 0.45 },
  dominant: { breathe: 1.5, bob: 0.16, lean: 0.012, recoil: 0.25 },
  elder: { breathe: 2.4, bob: 0.25, lean: 0.035, recoil: 0.65 },
  sick: { breathe: 3.1, bob: 0.2, lean: 0.04, recoil: 0.75 },
  veteran: { breathe: 1.8, bob: 0.4, lean: 0.045, recoil: 0.35 },
  classic: { breathe: 2.2, bob: 0.45, lean: 0.025, recoil: 0.55 },
};
