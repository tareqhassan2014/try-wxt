import type { SurfaceRegistry } from '@/surfaces/registry';
import { youtubeTheme } from './theme';

export const youtubeRegistry: SurfaceRegistry = {
  name: 'youtube',
  matches: ['*://*.youtube.com/*'],
  // #center holds the search box; placing our host first puts the Filter
  // button just left of the search box, in the gap after the logo.
  anchorSelector: '#center',
  append: 'first',
  theme: youtubeTheme,
};
