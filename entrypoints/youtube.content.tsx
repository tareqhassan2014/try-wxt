import ReactDOM from 'react-dom/client';
import '@/assets/theme.css';
import { youtubeRegistry } from '@/surfaces/youtube/registry';
import { ShadowRootProvider } from '@/components/overlay/ShadowRootContext';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { FilterFeature } from '@/surfaces/youtube/FilterFeature';
import { waitForElement } from './youtube/waitForElement';

export default defineContentScript({
  matches: youtubeRegistry.matches,
  cssInjectionMode: 'ui',
  async main(ctx) {
    let ui: Awaited<ReturnType<typeof createShadowRootUi>> | undefined;

    async function mount() {
      // Re-mount is idempotent: if our host is still attached, do nothing.
      if (ui?.shadowHost?.isConnected) return;

      const masthead = await waitForElement('ytd-masthead', { timeout: 15000 });
      const anchor = masthead?.querySelector(youtubeRegistry.anchorSelector);
      if (!anchor) {
        console.warn('[yt-filter] masthead anchor not found');
        return;
      }

      ui = await createShadowRootUi(ctx, {
        name: 'yt-filter-ui',
        position: 'inline',
        anchor,
        append: youtubeRegistry.append,
        onMount(uiContainer, _shadow, shadowHost) {
          const root = ReactDOM.createRoot(uiContainer);
          root.render(
            <ShadowRootProvider container={uiContainer} host={shadowHost}>
              <ThemeProvider surface={youtubeRegistry.theme} target={uiContainer}>
                <FilterFeature />
              </ThemeProvider>
            </ShadowRootProvider>,
          );
          return root;
        },
        onRemove(root) {
          root?.unmount();
        },
      });
      ui.mount();
    }

    await mount();

    // YouTube is a SPA; if the masthead is replaced on navigation, re-mount.
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      mount();
    });
  },
});
