import { describe, it, expect } from 'vitest';
import sample from './__fixtures__/get_screen.sample.json';
import { parseApv, parseCtr, parseMetrics } from './parse';

describe('parse get_screen', () => {
  it('parses APV as a percentage (fraction x 100)', () => {
    expect(parseApv(sample)).toBeCloseTo(45.67, 2);
  });
  it('parses CTR stripping comma and percent', () => {
    expect(parseCtr(sample)).toBeCloseTo(3.4567, 4);
  });
  it('parseMetrics returns both', () => {
    const m = parseMetrics(sample);
    expect(m.apv).toBeCloseTo(45.67, 2);
    expect(m.ctr).toBeCloseTo(3.4567, 4);
  });
  it('returns undefined for missing fields, never throws', () => {
    expect(parseApv({})).toBeUndefined();
    expect(parseCtr({})).toBeUndefined();
    expect(parseMetrics(null)).toEqual({ ctr: undefined, apv: undefined });
  });
});
