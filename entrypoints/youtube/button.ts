export const PANEL_BUTTON_ID = 'wxt-yt-panel-button';

export function createPanelButton(onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = PANEL_BUTTON_ID;
  button.type = 'button';
  button.textContent = 'Panel';
  button.setAttribute('aria-label', 'Toggle panel');
  button.style.cssText =
    'margin:0 8px;padding:0 12px;height:36px;border:none;border-radius:18px;' +
    'background:#272727;color:#fff;cursor:pointer;font-size:14px;';
  button.addEventListener('click', onClick);
  return button;
}

export function injectButton(
  masthead: Element,
  onClick: () => void,
): HTMLButtonElement | null {
  if (document.getElementById(PANEL_BUTTON_ID)) return null;
  const button = createPanelButton(onClick);
  masthead.prepend(button);
  return button;
}
