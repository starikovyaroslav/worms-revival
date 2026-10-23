import { describe, expect, it } from 'vitest';
import { TEAM_PREVIEW_CLASSES, teamPreviewUrl } from '../src/ui/teamPreviews';

describe('staged menu team previews', () => {
  it('provides a distinct production image for every class and the mixed roster', () => {
    expect(TEAM_PREVIEW_CLASSES).toHaveLength(10);
    expect(new Set(TEAM_PREVIEW_CLASSES.map(teamPreviewUrl)).size).toBe(10);
    for (const family of TEAM_PREVIEW_CLASSES)
      expect(teamPreviewUrl(family)).toBe(`/assets/team-previews/${family}.png`);
  });
  it('keeps the legacy team usable with a classic representative preview', () => {
    expect(teamPreviewUrl('legacy')).toBe(teamPreviewUrl('classic'));
  });
  it('falls back to the mixed illustration for unknown classes', () => {
    expect(teamPreviewUrl('missing')).toBe(teamPreviewUrl('mixed'));
    expect(teamPreviewUrl('../../elsewhere')).toBe(teamPreviewUrl('mixed'));
  });
});
