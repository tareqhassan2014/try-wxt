import { describe, it, expect } from 'vitest';
import { youtubeRegistry } from './registry';
import { youtubeTheme } from './theme';

describe('youtubeRegistry', () => {
  it('matches youtube.com URLs', () => {
    expect(youtubeRegistry.matches).toContain('*://*.youtube.com/*');
  });

  it('anchors at the masthead #center, placed first', () => {
    expect(youtubeRegistry.anchorSelector).toBe('#center');
    expect(youtubeRegistry.append).toBe('first');
  });

  it('uses the youtube theme resolver', () => {
    expect(youtubeRegistry.theme).toBe(youtubeTheme);
  });
});
