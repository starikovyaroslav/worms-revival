/** Presentation-only variations; source lineage is never used to change burn damage or collisions. */
export function fireStyle(source: string): { width: number; tint: number; fps: number } {
  if (source === 'napalm') return { width: 18, tint: 0xffccaa, fps: 9 };
  if (source === 'petrol' || source === 'barrel') return { width: 14, tint: 0xffaa88, fps: 12 };
  if (source === 'flamethrower') return { width: 12, tint: 0xffffff, fps: 16 };
  if (source === 'frenchsheep') return { width: 16, tint: 0xffddaa, fps: 13 };
  return { width: 14, tint: 0xffffff, fps: 11 };
}
