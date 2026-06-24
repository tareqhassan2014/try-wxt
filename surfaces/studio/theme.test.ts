import { describe, it, expect, afterEach } from 'vitest';
import { studioTheme } from './theme';

afterEach(() => document.documentElement.removeAttribute('dark'));

describe('studioTheme.read', () => {
  // NOTE: Studio's real dark-mode signal is UNCONFIRMED (spec open item).
  // Current best guess mirrors public YouTube: a `dark` attribute on <html>.
  // Verify live in a Studio session and update this resolver + test together.
  it('returns dark when the dark signal is present', () => {
    document.documentElement.setAttribute('dark', '');
    expect(studioTheme.read()).toBe('dark');
  });

  it('returns light when the dark signal is absent', () => {
    expect(studioTheme.read()).toBe('light');
  });
});
