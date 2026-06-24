import { describe, it, expect, afterEach } from 'vitest';
import { youtubeTheme } from './theme';

afterEach(() => document.documentElement.removeAttribute('dark'));

describe('youtubeTheme.read', () => {
  it('returns dark when <html> has the dark attribute', () => {
    document.documentElement.setAttribute('dark', '');
    expect(youtubeTheme.read()).toBe('dark');
  });

  it('returns light when <html> has no dark attribute', () => {
    expect(youtubeTheme.read()).toBe('light');
  });
});
