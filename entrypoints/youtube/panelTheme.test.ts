import { describe, it, expect, afterEach } from 'vitest';
import { readYouTubeTheme } from './panelTheme';

describe('readYouTubeTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dark');
  });

  it('returns "dark" when <html> has the dark attribute', () => {
    document.documentElement.setAttribute('dark', '');
    expect(readYouTubeTheme()).toBe('dark');
  });

  it('returns "light" when <html> has no dark attribute', () => {
    expect(readYouTubeTheme()).toBe('light');
  });
});
