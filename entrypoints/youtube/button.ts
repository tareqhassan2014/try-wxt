export const PANEL_BUTTON_ID = 'wxt-yt-panel-button';

export function createPanelButton(onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = PANEL_BUTTON_ID;
  button.type = 'button';
  button.setAttribute('aria-label', 'Toggle filter panel');
  button.innerHTML =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">' +
    '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5z"/></svg><span>Filter</span>';
  // margin-left:auto pushes the button to the right of #center's free space so
  // it sits adjacent to the search box (which follows it) rather than at the
  // far-left edge of the centre section.
  button.style.cssText =
    'display:inline-flex;align-items:center;gap:6px;margin-left:auto;' +
    'margin-right:12px;padding:0 12px;height:36px;border:none;border-radius:18px;' +
    'background:#272727;color:#fff;cursor:pointer;font-size:14px;flex:0 0 auto;';
  button.addEventListener('click', onClick);
  return button;
}

export function injectButton(
  anchor: Element,
  onClick: () => void,
): HTMLButtonElement | null {
  if (document.getElementById(PANEL_BUTTON_ID)) return null;
  const button = createPanelButton(onClick);
  // Prepend so the button becomes the first child of the anchor — when the
  // anchor is the masthead's #center section, that places it just left of the
  // search box, in the gap between the logo and the search box.
  anchor.prepend(button);
  return button;
}
