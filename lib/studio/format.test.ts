import { describe, it, expect } from 'vitest';
import { formatPercent, formatCtr, formatApv } from './format';

describe('formatPercent', () => {
  it('one decimal when hundredths off', () => {
    expect(formatPercent(3.456, false)).toBe('3.5%');
  });
  it('two decimals when hundredths on', () => {
    expect(formatPercent(3.456, true)).toBe('3.46%');
  });
  it('pads trailing zeros to fixed precision', () => {
    expect(formatPercent(45.6, true)).toBe('45.60%');
    expect(formatPercent(45, false)).toBe('45.0%');
  });
  it('handles zero', () => {
    expect(formatPercent(0, true)).toBe('0.00%');
  });
});

describe('formatCtr / formatApv', () => {
  it('ctr formats like percent', () => {
    expect(formatCtr(3.456, true)).toBe('3.46%');
  });
  it('apv formats like percent', () => {
    expect(formatApv(45.678, false)).toBe('45.7%');
  });
});
