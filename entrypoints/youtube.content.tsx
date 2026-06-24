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

    const masthead = await waitForElement('ytd-masthead #end', { timeout: 15000 });
    if (!masthead) {
      console.warn('[yt-panel] masthead not found');
      return;
    }
    injectButton(masthead, () => state.toggle());
  },
});
