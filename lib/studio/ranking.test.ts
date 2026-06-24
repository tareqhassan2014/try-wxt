import { describe, it, expect } from 'vitest';
import { classifyRanking } from './ranking';

describe('classifyRanking', () => {
  it('above when clearly higher than baseline', () => {
    expect(classifyRanking(12, 10)).toBe('above');
  });
  it('below when clearly lower than baseline', () => {
    expect(classifyRanking(8, 10)).toBe('below');
  });
  it('typical within tolerance band', () => {
    expect(classifyRanking(10.2, 10)).toBe('typical');
    expect(classifyRanking(9.8, 10)).toBe('typical');
  });
  it('respects custom tolerance at the boundary', () => {
    expect(classifyRanking(10.5, 10, 0.05)).toBe('above');
    expect(classifyRanking(10.5, 10, 0.1)).toBe('typical');
  });
  it('returns typical when baseline is non-positive', () => {
    expect(classifyRanking(5, 0)).toBe('typical');
  });
});
