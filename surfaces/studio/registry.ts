import type { SurfaceRegistry } from '@/surfaces/registry';
import { studioTheme } from './theme';

/**
 * STUB — no Studio feature ships yet. `anchorSelector` is a placeholder and
 * MUST be confirmed in a live Studio session before any feature mounts here.
 */
export const studioRegistry: SurfaceRegistry = {
  name: 'studio',
  matches: ['*://studio.youtube.com/*'],
  anchorSelector: 'ytcp-header',
  append: 'last',
  theme: studioTheme,
};
