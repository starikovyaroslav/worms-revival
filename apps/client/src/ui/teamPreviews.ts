/** Menu illustrations represent the cosmetic class, not the exact live roster. */
export const TEAM_PREVIEW_CLASSES = [
  'heavy',
  'soft',
  'glam',
  'dominant',
  'elder',
  'sick',
  'veteran',
  'classic',
  'nocturne',
  'mixed',
] as const;
export function teamPreviewUrl(characterClass: string): string {
  const family = characterClass === 'legacy' ? 'classic' : characterClass;
  return `/assets/team-previews/${TEAM_PREVIEW_CLASSES.includes(family as (typeof TEAM_PREVIEW_CLASSES)[number]) ? family : 'mixed'}.png`;
}
