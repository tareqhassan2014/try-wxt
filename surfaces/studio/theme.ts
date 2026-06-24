import type { SurfaceTheme } from '@/lib/theme/resolvers';

/**
 * TBD — Studio's dark-mode signal is unconfirmed (spec open item). Best guess:
 * mirror public YouTube (`dark` attribute on <html>). MUST be verified in a
 * live Studio session; update read()/observe() and the test together when the
 * real signal is known (likely a CSS-variable probe such as
 * `--yt-spec-base-background`).
 */
export const studioTheme: SurfaceTheme = {
  read() {
    return document.documentElement.hasAttribute('dark') ? 'dark' : 'light';
  },
  observe(onChange) {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dark'],
    });
    return () => observer.disconnect();
  },
};
