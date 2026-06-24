import { describe, it, expect, beforeEach } from 'vitest';
import { isOutsidePanelClick } from './outsideClick';
import { PANEL_BUTTON_ID } from './button';

describe('isOutsidePanelClick', () => {
  let panel: HTMLDivElement;

  beforeEach(() => {
    panel = document.createElement('div');
  });

  it('returns false when the click path includes the panel element', () => {
    const inner = document.createElement('span');
    expect(isOutsidePanelClick([inner, panel, document.body], panel)).toBe(false);
  });

  it('returns false when the click path includes the toggle button', () => {
    const button = document.createElement('button');
    button.id = PANEL_BUTTON_ID;
    expect(isOutsidePanelClick([button, document.body], panel)).toBe(false);
  });

  it('returns true for a click elsewhere on the page', () => {
    const other = document.createElement('div');
    expect(isOutsidePanelClick([other, document.body, document], panel)).toBe(true);
  });

  it('returns true when the panel element is null (not yet mounted)', () => {
    const other = document.createElement('div');
    expect(isOutsidePanelClick([other], null)).toBe(true);
  });
});
