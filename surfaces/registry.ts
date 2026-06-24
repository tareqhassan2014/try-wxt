import type { SurfaceTheme } from '@/lib/theme/resolvers';

/**
 * Describes how a feature attaches to one host surface: where it mounts, which
 * URLs it runs on, and how it reads the theme. One registry entry per surface.
 */
export interface SurfaceRegistry {
  name: string;
  matches: string[];
  /** Selector for the element the UI is anchored to, within the host page. */
  anchorSelector: string;
  /** Where to place the shadow host relative to the anchor's children. */
  append: 'first' | 'last';
  theme: SurfaceTheme;
}
