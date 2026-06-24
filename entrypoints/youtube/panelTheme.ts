export type Theme = 'dark' | 'light';

/**
 * YouTube signals dark mode by setting a `dark` attribute on the <html>
 * element (and removing it for light mode). The panel lives in an isolated
 * shadow root, so it cannot inherit YouTube's CSS — it reads this attribute
 * and applies matching colours itself.
 */
export function readYouTubeTheme(doc: Document = document): Theme {
  return doc.documentElement.hasAttribute('dark') ? 'dark' : 'light';
}
