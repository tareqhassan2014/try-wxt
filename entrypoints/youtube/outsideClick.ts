import { PANEL_BUTTON_ID } from './button';

/**
 * Decide whether a pointer event should close the panel.
 *
 * `path` is the event's composedPath() — it crosses the shadow-root boundary,
 * so clicks inside the shadow-mounted panel include `panelEl`, and clicks on
 * the masthead toggle button (light DOM) include an element with
 * PANEL_BUTTON_ID. Both are treated as "inside" and must NOT close the panel
 * (the button has its own toggle handler; closing here would fight it).
 */
export function isOutsidePanelClick(
  path: EventTarget[],
  panelEl: Element | null,
): boolean {
  if (panelEl && path.includes(panelEl)) return false;
  if (path.some((target) => target instanceof Element && target.id === PANEL_BUTTON_ID)) {
    return false;
  }
  return true;
}
