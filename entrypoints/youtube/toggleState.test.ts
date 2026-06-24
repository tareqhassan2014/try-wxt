import { describe, it, expect, vi } from 'vitest';
import { createToggleState } from './toggleState';

describe('createToggleState', () => {
  it('starts closed by default', () => {
    expect(createToggleState().get()).toBe(false);
  });

  it('honors the initial value', () => {
    expect(createToggleState(true).get()).toBe(true);
  });

  it('toggle() flips the value and notifies subscribers', () => {
    const state = createToggleState();
    const listener = vi.fn();
    state.subscribe(listener);
    state.toggle();
    expect(state.get()).toBe(true);
    expect(listener).toHaveBeenCalledWith(true);
  });

  it('set() updates the value and notifies subscribers', () => {
    const state = createToggleState(true);
    const listener = vi.fn();
    state.subscribe(listener);
    state.set(false);
    expect(state.get()).toBe(false);
    expect(listener).toHaveBeenCalledWith(false);
  });

  it('unsubscribe stops notifications', () => {
    const state = createToggleState();
    const listener = vi.fn();
    const unsubscribe = state.subscribe(listener);
    unsubscribe();
    state.toggle();
    expect(listener).not.toHaveBeenCalled();
  });
});
