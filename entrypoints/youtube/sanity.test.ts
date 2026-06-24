import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
  it('has a DOM with MutationObserver', () => {
    expect(typeof document).toBe('object');
    expect(typeof MutationObserver).toBe('function');
  });
});
