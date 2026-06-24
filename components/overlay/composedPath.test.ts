import { describe, it, expect } from 'vitest';
import { isInsideShadowHost } from './composedPath';

describe('isInsideShadowHost', () => {
  it('returns true when the host is in the path', () => {
    const host = document.createElement('div');
    const child = document.createElement('span');
    expect(isInsideShadowHost([child, host, document.body], host)).toBe(true);
  });

  it('returns false when the host is not in the path', () => {
    const host = document.createElement('div');
    const other = document.createElement('div');
    expect(isInsideShadowHost([other, document.body], host)).toBe(false);
  });

  it('returns false when host is null', () => {
    expect(isInsideShadowHost([document.body], null)).toBe(false);
  });
});
