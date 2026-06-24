import { describe, it, expect } from 'vitest';
import { rankingIconSvg } from './icons';

describe('rankingIconSvg', () => {
  it('renders a 16x16 non-focusable svg', () => {
    const svg = rankingIconSvg('above');
    expect(svg).toContain('width="16"');
    expect(svg).toContain('height="16"');
    expect(svg).toContain('focusable="false"');
    expect(svg).toContain('viewBox="0 0 24 24"');
  });
  it('uses green for above and typical', () => {
    expect(rankingIconSvg('above')).toContain('#2ba640');
    expect(rankingIconSvg('typical')).toContain('#2ba640');
  });
  it('uses gray for below', () => {
    expect(rankingIconSvg('below')).toContain('#909090');
  });
  it('renders distinct paths per ranking', () => {
    const a = rankingIconSvg('above');
    const b = rankingIconSvg('below');
    const t = rankingIconSvg('typical');
    expect(a).not.toBe(b);
    expect(a).not.toBe(t);
    expect(b).not.toBe(t);
  });
});
