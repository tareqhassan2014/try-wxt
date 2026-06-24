export type Theme = 'dark' | 'light';

/**
 * A per-surface theme source. `read()` returns the current theme; `observe()`
 * starts watching the surface's signal and returns a cleanup function.
 */
export interface SurfaceTheme {
  read(): Theme;
  observe(onChange: () => void): () => void;
}
