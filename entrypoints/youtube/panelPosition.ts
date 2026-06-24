export const PANEL_WIDTH = 320;

const EDGE_GAP = 8;

/**
 * Position the panel just below the toggle button, left-aligned with it, but
 * clamped so it never overflows the viewport's left or right edge.
 */
export function computePanelPosition(
  rect: { bottom: number; left: number },
  viewportWidth: number,
  width = PANEL_WIDTH,
): { top: number; left: number } {
  const maxLeft = viewportWidth - width - EDGE_GAP;
  const left = Math.max(EDGE_GAP, Math.min(rect.left, maxLeft));
  return { top: rect.bottom + EDGE_GAP, left };
}
