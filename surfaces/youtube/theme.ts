import type { SurfaceTheme } from '@/lib/theme/resolvers';

/**
 * Public YouTube signals dark mode with a `dark` attribute on <html>.
 */
export const youtubeTheme: SurfaceTheme = {
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
