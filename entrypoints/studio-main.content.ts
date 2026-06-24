// entrypoints/studio-main.content.ts
import { studioRegistry } from '@/surfaces/studio/registry';
import { createContextCapture } from '@/lib/studio/context';
import { fetchScreen } from '@/lib/studio/api';
import { parseMetrics } from '@/lib/studio/parse';
import { formatCtr, formatApv } from '@/lib/studio/format';
import { classifyRanking } from '@/lib/studio/ranking';
import {
  findPerformanceCard,
  findMetricCells,
  setGuardedText,
} from '@/lib/studio/dom';
import { readConfigMessage, DEFAULT_CONFIG, type StudioConfig } from '@/lib/studio/messages';

export default defineContentScript({
  matches: studioRegistry.matches,
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    let config: StudioConfig = DEFAULT_CONFIG;
    const ytcfg = (window as unknown as { ytcfg?: { get(k: string): unknown } }).ytcfg;
    const capture = createContextCapture({ fetch: window.fetch.bind(window), ytcfg });
    capture.install();

    // Receive config from the ISOLATED bridge (Task 10).
    window.addEventListener('message', (e) => {
      const next = readConfigMessage(e);
      if (next) config = next;
    });

    const guards: Array<() => void> = [];

    async function enrich() {
      try {
        if (!capture.ready()) return;
        const card = findPerformanceCard();
        if (!card) return;

        // Idempotency: skip cards already enriched (prevents re-fetch on every mutation).
        // A SPA navigation replaces the element, so fresh cards naturally lack the marker.
        if (card.hasAttribute('data-newstudio-enriched')) return;

        // NOTE: row → videoId extraction and the ranking baseline depend on the
        // live DOM/response shape (see plan Open Items). The wiring below shows
        // the data flow; selectors/baseline are finalized during Task 12.
        const videoId = card.getAttribute('test-id') || '';
        if (!videoId) return;

        const ctx = capture.get();
        const [overview, reach] = await Promise.all([
          fetchScreen(videoId, 'ANALYTICS_TAB_ID_OVERVIEW', ctx),
          fetchScreen(videoId, 'ANALYTICS_TAB_ID_REACH', ctx),
        ]);
        const apv = parseMetrics(overview).apv;
        const ctr = parseMetrics(reach).ctr;

        const cells = findMetricCells(card);
        for (const cell of cells) {
          const label = (cell.closest('[id^="table-row"]')?.textContent || '').toLowerCase();
          if (ctr !== undefined && /ctr|click through/.test(label)) {
            guards.push(setGuardedText(cell, formatCtr(ctr, config.showCtrHundredths)));
          } else if (apv !== undefined && /average percentage viewed|average view percentage/.test(label)) {
            guards.push(setGuardedText(cell, formatApv(apv, config.showApvHundredths)));
          }
        }
        void classifyRanking; // ranking-icon injection wired once baseline is confirmed (Task 12)

        card.setAttribute('data-newstudio-enriched', 'true');
      } catch (err) {
        console.warn('[newstudio] enrich error', err);
      }
    }

    function teardown() {
      observer.disconnect();
      while (guards.length) guards.pop()!();
    }

    // Re-run on DOM changes (card mounts late / SPA nav rebuilds it).
    const observer = new MutationObserver(() => void enrich());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    void enrich();

    window.addEventListener('beforeunload', teardown);
  },
});
