# Studio "Latest Content Performance" Enrichment — Design

**Date:** 2026-06-24
**Status:** Approved (design)
**Surface:** `studio.youtube.com` (new)

## Goal

Enhance the native "Latest Content Performance" card on the YouTube Studio
dashboard by injecting higher-precision metrics and ranking visualizations that
YouTube does not surface natively:

- **Precise CTR** — click-through rate to hundredths (2 decimals).
- **Precise APV** — average percentage viewed to hundredths.
- **Ranking icons** — above / below / typical performance trend icons per row.
- **Loading UX** — spinners + overlay while background data is fetched.

This is a **faithful native port** of an existing Parcel-bundled MAIN-world
script (`custom-content-page-main.js` et al.), reimplemented cleanly in
TypeScript. It enriches the **native** Studio DOM in place; it does **not** use
the shadow-root / shadcn overlay layer (that layer stays for YouTube features).

## Non-Goals

- No changes to the existing YouTube `FilterFeature` or the shared shadcn/shadow
  UI layer.
- No new analytics beyond CTR, APV, and ranking classification.
- No server/background data layer beyond what the content scripts need.

## Architecture & World Split

Three cooperating pieces. The split is forced by browser-extension world rules:
the `window.fetch` override and INNERTUBE context capture **must** run in the
MAIN world; only the ISOLATED world has `browser.*` APIs.

```
entrypoints/
  studio-main.content.ts    world: MAIN     — fetch intercept, get_screen, DOM enrichment, observers
  studio-bridge.content.ts  world: ISOLATED — reads browser.storage.sync, relays config -> MAIN
  popup/                    settings toggles (shadcn) -> writes browser.storage.sync
```

- **MAIN** (`studio-main`): overrides page `window.fetch` to capture the page's
  auth header + INNERTUBE context + api key; performs the authed `get_screen`
  requests; reads & mutates the shared DOM (enrichment runs here, faithful to
  the original).
- **ISOLATED** (`studio-bridge`): the only world that can read
  `browser.storage.sync`. Reads config at startup, pushes it to MAIN via
  `window.postMessage` (typed + origin-checked), and re-pushes on
  `storage.onChanged`.
- **Popup**: settings UI (reuses existing shadcn components) that writes config
  to `browser.storage.sync`.

**Config flow:** `popup -> storage.sync -> bridge (ISOLATED) -> postMessage -> main (MAIN)`.

**Manifest:** add `*://studio.youtube.com/*` to the matches for the two new
content scripts. Existing YouTube content script is untouched.

## Module Breakdown

Pure logic is separated from DOM/network so it unit-tests without a browser.
The fragile, YouTube-coupled parts are thin adapters; all decision logic is pure.

### Pure modules (fully unit-testable, TDD)

| Module | Responsibility |
|---|---|
| `lib/studio/format.ts` | `formatCtr(raw, hundredths)`, `formatApv(raw, hundredths)` via `Intl.NumberFormat`. Number -> `"3.46%"`. Handles comma/percent stripping, 1 vs 2 decimals. |
| `lib/studio/ranking.ts` | `classifyRanking(value, baseline) -> 'above' \| 'below' \| 'typical'` + threshold logic. |
| `lib/studio/parse.ts` | Extract APV/CTR from `get_screen` response (`audienceRetentionHighlightsCardData.videosData[].metricTotals.avgPercentageWatched`; CTR metric regex match). Returns typed `{ ctr?, apv? }`; missing field -> `undefined`, never throws. |
| `lib/studio/icons.ts` | SVG markup strings for above/below/typical (green `#2ba640` / gray `#909090`). |
| `lib/studio/messages.ts` | Typed postMessage protocol (config payload, message-type tag, origin guard) shared by bridge + main. |

### Side-effectful adapters (thin; manual/integration verified)

| Module | Responsibility |
|---|---|
| `lib/studio/context.ts` | Install `window.fetch` proxy; capture `{ authHeader, innertubeContext, apiKey }`. apiKey from `ytcfg.get('INNERTUBE_API_KEY')` if available, else fallback constant. |
| `lib/studio/api.ts` | `fetchScreen(videoId, tab, ctx)` builds payload, POSTs `get_screen`. Tabs: `ANALYTICS_TAB_ID_OVERVIEW` (APV), `ANALYTICS_TAB_ID_REACH` (CTR). |
| `lib/studio/dom.ts` | Find Latest Content Performance card, locate metric rows/cells, write enriched value, inject ranking icon, spinner/overlay helpers. |
| `lib/studio/observe.ts` | MutationObserver guard: re-assert enriched text if YouTube rewrites it (700ms debounce after native spinner clears, 20s cap). |
| `entrypoints/studio-main.content.ts` | Orchestrator wiring the above together. |
| `entrypoints/studio-bridge.content.ts` | storage read + relay to MAIN. |

**Rationale:** when YouTube changes its DOM/API, only the adapters change; the
tested pure logic stays put.

## Data Flow & Lifecycle

```
document_start (MAIN): context.ts installs fetch proxy
   -> YT makes its own requests; proxy captures authHeader + innertubeContext + apiKey (~4s window)
   -> dom.ts finds "Latest Content Performance" card (regex /latest/i + /performance/i on ytcd-card)
   -> for each ranking row (has videoId):
        show spinner
        api.fetchScreen(videoId, OVERVIEW) -> parse APV
        api.fetchScreen(videoId, REACH)    -> parse CTR
        format with current config (hundredths flags)
        write enriched cell text + inject ranking icon (classifyRanking)
        observe.ts guards each cell against YT rewrites
   -> native spinner clears -> 700ms debounce -> remove overlay (20s cap)
```

- **Config changes:** bridge pushes config at startup + on `storage.onChanged`.
  Main caches it; on change, **re-formats already-enriched cells** (no refetch).
- **SPA navigation:** Studio is an SPA; the card rebuilds on route change. A
  top-level observer re-runs enrichment when a new card mounts. Old per-cell
  observers are torn down to avoid leaks.

## Error Handling & Fragility

YouTube internals are fragile. Every YT-coupled adapter degrades to "native page
unchanged." Never break the native page.

- **Context capture timeout:** not captured in ~4s -> abort silently, native UI
  intact, warn only.
- **apiKey:** prefer `ytcfg.get('INNERTUBE_API_KEY')`; fall back to known
  constant; if both absent -> abort.
- **fetch proxy:** wrap original `fetch` in try/finally; always call through to
  the real fetch. Never swallow page requests.
- **get_screen failure** (non-200 / schema drift): per-video try/catch -> skip
  that row, remove its spinner, leave native value. One bad video != feature
  dead.
- **parse.ts:** returns `undefined` for missing fields, never throws.
- **Selectors miss:** card/rows/cells not found -> no-op + warn; re-attempt on
  next mutation.
- **Observer guard cap:** 20s max then disconnect — prevents runaway loops.
- **postMessage:** strict `origin === location.origin` + message-type tag check;
  ignore everything else (do not trust arbitrary page messages).

## Testing & Verification

No test runner is configured yet. Add **Vitest** (Vite-native, fits WXT).

### Unit (TDD, pure modules)

- `format.ts` — CTR/APV at 1 vs 2 decimals, comma/percent stripping, edge `0` /
  `undefined`.
- `ranking.ts` — above/below/typical thresholds, boundary values.
- `parse.ts` — extract from a real `get_screen` JSON fixture; missing-field ->
  undefined.
- `messages.ts` — origin guard accept/reject, type-tag filtering.
- `icons.ts` — correct SVG / color per class.

### Manual (browser; YT coupling can't be unit-tested)

- `pnpm dev` -> load on studio.youtube.com dashboard.
- Verify: CTR/APV show hundredths; ranking icons correct color/direction;
  spinner -> enriched transition; popup toggle flips precision live (no reload);
  SPA nav re-enriches; YT rewrite re-asserted by guard.

### Static

- `pnpm compile` (tsc --noEmit) clean — required gate.

### Fixtures

- Capture one real `get_screen` response during dev -> commit as fixture for
  `parse.ts` tests.

## Key Constants (from original, to verify live)

- Endpoint: `https://studio.youtube.com/youtubei/v1/yta_web/get_screen?alt=json&key=<API_KEY>`
- Secondary (cache only): `.../yta_web/get_cards`
- Card detect: `ytcd-card` where text matches `/latest/i` AND `/performance/i`
- Metric rows: `#metrics-table > div, #metrics-table > .table-row, [id^='table-row']`
- Metric cells: `.metrics-value, .table-value`
- CTR regex: `/impressions click through rate|click through rate|thumbnail impressions vtr|\bctr\b/i`
- APV regex: `/average percentage viewed|average view percentage/i`
- Timing: ~4s auth-capture window, 700ms spinner debounce, 20s overlay/guard cap

## Open Items (verify during implementation)

- Confirm exact `get_screen` response shape against a live capture (selectors and
  field paths above are from the minified original and may have drifted).
- Confirm Studio dashboard card/row selectors against the live DOM.
- Confirm config keys + defaults: `showCtrHundredths`, `showApvHundredths`
  (default both **on** per chosen scope).
- Confirm `classifyRanking` baseline source. The original inferred above/below/
  typical from a `data-newstudioTypicalIcon` attribute; the underlying threshold
  (channel average vs historical percentile) is unconfirmed. Determine the real
  signal from a live capture before finalizing `ranking.ts`.
