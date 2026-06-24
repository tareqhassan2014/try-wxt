import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PANEL_BUTTON_ID, createPanelButton, injectButton } from './button';

describe('createPanelButton', () => {
  it('builds a button with the marker id and wires the click handler', () => {
    const onClick = vi.fn();
    const button = createPanelButton(onClick);
    expect(button.id).toBe(PANEL_BUTTON_ID);
    button.click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('injectButton', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('inserts the button into the masthead', () => {
    const masthead = document.createElement('div');
    document.body.appendChild(masthead);
    const button = injectButton(masthead, vi.fn());
    expect(button).not.toBeNull();
    expect(masthead.querySelector(`#${PANEL_BUTTON_ID}`)).toBe(button);
  });

  it('returns null and does not duplicate when already present', () => {
    const masthead = document.createElement('div');
    document.body.appendChild(masthead);
    injectButton(masthead, vi.fn());
    const second = injectButton(masthead, vi.fn());
    expect(second).toBeNull();
    expect(document.querySelectorAll(`#${PANEL_BUTTON_ID}`)).toHaveLength(1);
  });
});
