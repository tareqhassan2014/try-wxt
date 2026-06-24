# YouTube Masthead Button + Toggle Panel — Design

**Date:** 2026-06-24
**Status:** Approved

## Goal

Add a button to the YouTube masthead (top nav bar, next to search/profile). Clicking it toggles a custom panel. First version: panel is an empty shell (title + close button). UI runs only on YouTube.

## Scope

In scope:
- Content script restricted to YouTube.
- Button injected into YouTube's existing masthead DOM.
- Toggleable panel rendered in an isolated shadow root.
- Plain scoped CSS. No Tailwind/shadcn.

Out of scope (later versions):
- Panel content beyond title + close button.
- Reading video info, playback control, persistence.

## Architecture

Single content script entrypoint:

```ts
// entrypoints/youtube.content.ts
export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  cssInjectionMode: 'ui',
  async main(ctx) { ... },
});
```

Two UI pieces with distinct concerns:

1. **Button** — injected directly into YouTube masthead DOM (`ytd-masthead #end`).
   Plain DOM element; no React needed for a single button.
2. **Panel** — React component mounted via WXT `createShadowRootUi(ctx, ...)`, appended
   to `document.body`. Shadow root isolates styles from YouTube's CSS.

Button click toggles panel via a shared toggle function exposed by the panel mount.

## Components

### 1. Entry (`youtube.content.ts`)
- Waits for masthead element to exist before injecting (YouTube hydrates async).
- Creates the shadow-root panel UI, gets back a `toggle()` handle.
- Injects the button, wiring its click to `toggle()`.
- Guards against double-injection (check for existing button by id/data-attr).

### 2. Button injector
- Builds a `<button>` with an id/data-attribute marker and label/icon.
- Inserts into `ytd-masthead #end` (falls back to `#buttons` if `#end` absent).
- On click → calls injected `toggle()`.
- Single responsibility: DOM insertion + click wiring. Depends on: masthead element, toggle fn.

### 3. Panel (React)
- Empty shell: header with title + close button, empty body.
- Local `open` state (`useState`). Renders hidden when closed (or unmounted container hidden).
- Exposes `toggle()` / `close()` to the entry.
- Plain CSS scoped inside the shadow root (`cssInjectionMode: 'ui'`).
- Single responsibility: render panel + own open/close state. Depends on: nothing external except the toggle wiring.

## Data flow

```
button click ──► toggle() ──► panel open state flips ──► panel shows/hides
close button ──► close()  ──► panel open state = false
```

State lives in the panel (single source of truth). Button is stateless; it only calls `toggle()`.

## YouTube SPA handling

- YouTube is a single-page app; the masthead persists across in-app navigations.
- Inject the button **once**. Re-injection guard prevents duplicates if `main` re-runs.
- Masthead may not exist when the script runs → wait for it via `MutationObserver`
  (or WXT element-wait helper) before injecting. Time out gracefully if never found.

## Error handling

- Masthead never appears (selector changed / not a watch context): log once, no-op, no throw.
- Button already present: skip injection.
- Panel mount failure: caught and logged; button injection still proceeds independently.

## Testing (manual)

1. `pnpm dev` → Chrome opens with extension loaded.
2. Navigate to `youtube.com` → button visible in masthead.
3. Click button → panel appears. Click again → panel hides.
4. Click panel close button → panel hides.
5. Navigate to a video, then to home (SPA nav) → button still present, no duplicates.
6. Confirm YouTube's own styles do not leak into the panel and vice versa.

## File changes

- Add: `entrypoints/youtube.content.ts` (entry + button injector).
- Add: panel React component + CSS (colocated under `entrypoints/youtube/` or inline).
- Remove/keep: existing `entrypoints/content.ts` (google.com demo) — replace, since it is
  starter boilerplate and no longer needed.
