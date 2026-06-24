import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import type { SurfaceTheme, Theme } from './resolvers';
import { ThemeProvider } from './ThemeProvider';

afterEach(cleanup);

function makeSurface(initial: Theme) {
  let current = initial;
  let listener: (() => void) | null = null;
  let disconnected = false;
  return {
    surface: {
      read: () => current,
      observe(onChange: () => void) {
        listener = onChange;
        return () => {
          disconnected = true;
        };
      },
    } as SurfaceTheme,
    set(next: Theme) {
      current = next;
      listener?.();
    },
    wasDisconnected: () => disconnected,
  };
}

describe('ThemeProvider', () => {
  it('adds the dark class when the surface reads dark', () => {
    const target = document.createElement('div');
    const { surface } = makeSurface('dark');
    render(<ThemeProvider surface={surface} target={target} />);
    expect(target.classList.contains('dark')).toBe(true);
  });

  it('does not add the dark class when the surface reads light', () => {
    const target = document.createElement('div');
    const { surface } = makeSurface('light');
    render(<ThemeProvider surface={surface} target={target} />);
    expect(target.classList.contains('dark')).toBe(false);
  });

  it('live-updates the class when the surface changes', () => {
    const target = document.createElement('div');
    const ctl = makeSurface('light');
    render(<ThemeProvider surface={ctl.surface} target={target} />);
    expect(target.classList.contains('dark')).toBe(false);
    act(() => ctl.set('dark'));
    expect(target.classList.contains('dark')).toBe(true);
  });

  it('disconnects the observer on unmount', () => {
    const target = document.createElement('div');
    const ctl = makeSurface('dark');
    const { unmount } = render(<ThemeProvider surface={ctl.surface} target={target} />);
    unmount();
    expect(ctl.wasDisconnected()).toBe(true);
  });
});
