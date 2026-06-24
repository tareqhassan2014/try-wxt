// entrypoints/studio-bridge.content.ts
import { studioRegistry } from '@/surfaces/studio/registry';
import { buildConfigMessage, DEFAULT_CONFIG, type StudioConfig } from '@/lib/studio/messages';

const STORAGE_KEY = 'studioConfig';

export default defineContentScript({
  matches: studioRegistry.matches,
  // ISOLATED is the default world; stated for clarity.
  world: 'ISOLATED',
  runAt: 'document_start',
  async main() {
    function push(config: StudioConfig) {
      window.postMessage(buildConfigMessage(config), window.location.origin);
    }

    async function read(): Promise<StudioConfig> {
      const stored = await browser.storage.sync.get(STORAGE_KEY);
      return { ...DEFAULT_CONFIG, ...(stored[STORAGE_KEY] as Partial<StudioConfig> | undefined) };
    }

    push(await read());

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[STORAGE_KEY]) {
        push({ ...DEFAULT_CONFIG, ...(changes[STORAGE_KEY].newValue as Partial<StudioConfig>) });
      }
    });
  },
});
