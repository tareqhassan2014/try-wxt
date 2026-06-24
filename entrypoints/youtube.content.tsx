import ReactDOM from 'react-dom/client';
import { Panel } from './youtube/panel';
import { createToggleState } from './youtube/toggleState';
import { injectButton } from './youtube/button';
import { waitForElement } from './youtube/waitForElement';

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const state = createToggleState();

    const ui = await createShadowRootUi(ctx, {
      name: 'yt-panel-ui',
      position: 'overlay',
      anchor: 'body',
      onMount(container) {
        const root = ReactDOM.createRoot(container);
        root.render(<Panel state={state} />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();

    async function ensureButton() {
      const mastheadEl = await waitForElement('ytd-masthead', { timeout: 15000 });
      if (!mastheadEl) {
        console.warn('[yt-panel] masthead not found');
        return;
      }
      // #center holds the search box; prepending here places the button just
      // left of the search box, in the gap between the logo and the search box.
      const anchor = mastheadEl.querySelector('#center');
      if (!anchor) {
        console.warn('[yt-panel] masthead anchor (#center) not found');
        return;
      }
      injectButton(anchor, () => state.toggle());
    }

    await ensureButton();

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      ensureButton();
    });
  },
});
