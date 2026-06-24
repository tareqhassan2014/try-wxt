import { describe, it, expect } from 'vitest';
import { computePanelPosition, PANEL_WIDTH } from './panelPosition';

describe('computePanelPosition', () => {
  it('places the panel 8px below the button, left-aligned with it', () => {
    const pos = computePanelPosition({ bottom: 56, left: 600 }, 1920);
    expect(pos).toEqual({ top: 64, left: 600 });
  });

  it('clamps to the right edge so the panel never overflows', () => {
    const pos = computePanelPosition({ bottom: 56, left: 1900 }, 1920);
    expect(pos.left).toBe(1920 - PANEL_WIDTH - 8);
  });

  it('clamps to the left edge for a button near x=0', () => {
    const pos = computePanelPosition({ bottom: 56, left: 0 }, 1920);
    expect(pos.left).toBe(8);
  });
});
