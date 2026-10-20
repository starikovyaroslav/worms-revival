import { describe, expect, it } from 'vitest';
import { onEscape } from '../src/ui/escFlow';

describe('Esc flow', () => {
  it('closes the weapon panel first, without opening the menu', () => {
    expect(onEscape(null, true)).toEqual({ dialog: null, closePanel: true });
  });

  it('then opens the menu', () => {
    expect(onEscape(null, false)).toEqual({ dialog: 'menu', closePanel: false });
  });

  it('inside the menu: sub-screens step back, the menu resumes, surrender is cancelled', () => {
    expect(onEscape('controls', false).dialog).toBe('menu');
    expect(onEscape('sound', false).dialog).toBe('menu');
    expect(onEscape('quit', false).dialog).toBe('menu');
    expect(onEscape('menu', false).dialog).toBeNull();
    expect(onEscape('surrender', false).dialog).toBeNull();
  });
});
