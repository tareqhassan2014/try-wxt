# shadcn Shared UI Foundation — Design

**Date:** 2026-06-24
**Status:** Approved (brainstorm), pending implementation plan
**Branch (proposed):** `feat/shadcn-shared-ui`

## Context

`try-wxt` is a WXT + React 19 + TypeScript browser extension intended to grow into
a 50+ feature extension across **public YouTube** (`ytd-*` Polymer DOM) and
**YouTube Studio** (`studio.youtube.com`, separate `ytcp-*` app). The first
feature — a masthead Filter button + panel — currently ships as hand-rolled plain
CSS plus bespoke positioning/dismiss/theme logic.

A prior spike (`spike/shadcn-shadow-root`, findings in
`docs/foundation-spike-findings.md`) de-risked a shadcn-based shared UI foundation.
Verdicts carried into this design:

- **Tailwind v4 in a WXT shadow root** — works. `@tailwindcss/vite` +
  `cssInjectionMode: 'ui'`. Requires `postcss-rem-to-responsive-pixel` because
  Tailwind `rem` resolves against the host page `<html>`, not the shadow root.
  **Already wired on `main`** (`postcss.config.mjs`, deps installed).
- **Radix Popover across the shadow boundary** — works only with a workaround.
  Radix `DismissableLayer` (unmerged upstream PR #2433) sees the shadow *host* as
  the event target, so a trigger click can close-then-reopen. Mitigated with an
  `onInteractOutside` + `event.composedPath()` guard.
- **Studio theme detection** — unresolved. Public YouTube exposes
  `document.documentElement.hasAttribute('dark')`; Studio's signal is unconfirmed.
  Use a CSS-variable probe and verify live.

## Decisions (locked in brainstorm)

1. **Scope:** Full shared UI layer — foundation + shadow-DOM-aware overlay wrapper
   + per-surface theme/injection abstractions.
2. **Overlay engine:** Radix primitives wrapped in ONE component that centralizes
   the PR #2433 `composedPath` guard (shadcn-native; rides the unmerged upstream
   fix, contained to one file).
3. **Proving ground:** Migrate the existing YouTube Filter panel onto the new
   layer this iteration. Studio gets a typed stub only (resolver + registry entry,
   no features).

## Goals

- Install shadcn properly (deps, `components.json`, `cn` util, theme CSS) adapted
  for Tailwind v4 inside a WXT shadow root.
- Provide ONE shadow-DOM-aware overlay primitive every feature reuses, so the
  PR #2433 workaround and Portal-into-shadow-root concern live in a single file.
- Provide a per-surface theme abstraction driving shadcn's CSS-variable `.dark`
  convention, with live-sync.
- Prove the foundation by migrating the Filter panel, deleting the hand-rolled
  CSS/positioning/dismiss/theme code it replaces.

## Non-Goals

- Building any Studio feature (Studio is a typed stub only).
- A general component library beyond what the Filter panel needs (`Button`,
  `Popover`). Add components when a feature needs them (YAGNI).
- Resolving the Studio theme signal definitively — flagged TBD, verified live later.

## Architecture

### Directory layout

```
lib/utils.ts              cn() = clsx + tailwind-merge
lib/theme/
  ThemeProvider.tsx       applies dark/light class + CSS vars on the shadow
                          container; live-syncs via MutationObserver
  resolvers.ts            SurfaceTheme resolver type + shared helpers
components/ui/            shadcn primitives (generated, lightly patched)
  button.tsx
  popover.tsx
components/overlay/
  ShadowPopover.tsx       THE shadow-DOM-aware Radix wrapper — composedPath
                          dismiss guard + Portal-into-shadow-root
  composedPath.ts         pure guard helper (unit-testable)
surfaces/
  youtube/
    theme.ts              resolver: html[dark] -> 'dark' | 'light'
    registry.ts           anchor/injection descriptor for the Filter feature
  studio/
    theme.ts              resolver: CSS-var probe (TBD — verify live)
    registry.ts           typed stub, no features
assets/theme.css          @import "tailwindcss"; @theme; shadcn :root/.dark vars
components.json            shadcn config (style, Tailwind v4, aliases)
```

Path alias `@/` already maps to project root (per `CLAUDE.md`), so shadcn aliases
`@/components`, `@/lib` resolve with no extra config.

### 1. Foundation install

- **Dependencies:** `@radix-ui/react-popover`, `@radix-ui/react-slot`,
  `class-variance-authority`, `clsx`, `tailwind-merge`. (`lucide-react` only if a
  feature needs icons — deferred.)
- **`components.json`:** Tailwind **v4** mode — `cssVariables: true`, no
  `tailwind.config` file. Aliases: `components: @/components`, `utils: @/lib/utils`,
  `ui: @/components/ui`.
- **`assets/theme.css`:** holds `@import "tailwindcss";`, the `@theme` block, and
  shadcn `:root` / `.dark` CSS-variable definitions. Each content script imports
  this file so it is injected into that surface's shadow root. The existing
  `postcss-rem-to-responsive-pixel` plugin converts emitted `rem` → `px`.
- **`lib/utils.ts`:** standard shadcn `cn()` (`twMerge(clsx(...))`).

### 2. ShadowPopover (the centralized wrapper)

Wraps Radix `Popover.Root` / `Popover.Trigger` / `Popover.Content`. Centralizes
two shadow-DOM concerns so no feature touches raw Radix:

- **Dismiss bug:** `onInteractOutside` calls a pure guard `isInsideShadowHost(event,
  hostEl)` that inspects `event.composedPath()`; if the path crosses our shadow
  host (open shadow root), the dismissal is prevented (`event.preventDefault()`),
  so a trigger click does not close-then-reopen.
- **Portal target:** `Popover.Portal container={shadowRoot}` renders content inside
  the themed shadow root rather than the host page `<body>`, so it inherits the
  injected Tailwind/shadcn styles and the theme class.

Radix owns positioning and collision handling (replaces the hand-rolled viewport
clamping).

### 3. ThemeProvider (per-surface)

`<ThemeProvider surface={youtubeSurface} container={shadowContainer}>`:

- Reads the surface resolver's current value (`'dark' | 'light'`).
- Toggles the `dark` class (and ensures base classes) on `container`, which drives
  the shadcn CSS variables in `assets/theme.css`.
- Installs a `MutationObserver` on the surface's signal source (e.g. `<html>`
  attributes for public YouTube) to live-sync theme changes. Cleans up on unmount.

Resolvers:

- **`surfaces/youtube/theme.ts`** — `document.documentElement.hasAttribute('dark')`.
- **`surfaces/studio/theme.ts`** — CSS-variable probe (e.g. read
  `--yt-spec-base-background` or equivalent). **Flagged TBD; verify in a live
  Studio browser session before relying on it.**

### 4. Filter panel migration (proving ground) — architecture change

**Current:** `entrypoints/youtube.content.tsx` injects a plain DOM button into
masthead `#center` imperatively (`injectButton`), and renders the panel in a
*separate* `body`-anchored overlay shadow root. Trigger and content are in
different DOM trees.

**Problem:** Radix Popover anchors `Content` to `Trigger` within a single React
tree. The split DOM cannot anchor cleanly.

**Change:** Mount a shadow-root UI **at masthead `#center`** that renders the whole
feature as one React tree:

```
<ThemeProvider surface={youtubeSurface} container={...}>
  <ShadowPopover>
    <ShadowPopover.Trigger asChild><Button>Filter</Button></ShadowPopover.Trigger>
    <ShadowPopover.Content>{/* filter panel body */}</ShadowPopover.Content>
  </ShadowPopover>
</ThemeProvider>
```

`createShadowRootUi` with `anchor: '#center'`, `position: 'inline'` (append),
replacing the `body` overlay. Radix positions the panel relative to the button.

**SPA resilience:** keep the `wxt:locationchange` listener and the
`waitForElement('ytd-masthead')` guard so the feature re-mounts on YouTube's
client-side navigations.

**Deleted / folded:**

| File | Fate |
|------|------|
| `entrypoints/youtube/panel.css` | deleted — Tailwind/shadcn classes |
| `entrypoints/youtube/panelPosition.ts` (+ test) | deleted — Radix collision handling |
| `entrypoints/youtube/outsideClick.ts` (+ test) | deleted — `ShadowPopover` onInteractOutside |
| `entrypoints/youtube/panelTheme.ts` (+ test) | folded — resolver moves to `surfaces/youtube/theme.ts`; live-sync moves to `ThemeProvider` |
| `entrypoints/youtube/toggleState.ts` (+ test) | folded — Radix controlled/uncontrolled open state (revisit if external toggling needed) |
| `entrypoints/youtube/button.ts` (+ test) | folded — button becomes the React `<Button>` trigger |
| `entrypoints/youtube/waitForElement.ts` (+ test) | **kept** — still needed to await the masthead anchor |
| `entrypoints/youtube/panel.tsx` | rewritten as the `ShadowPopover`-based feature |

## Data Flow

1. Content script `main(ctx)` → `waitForElement('ytd-masthead')` → resolve `#center`.
2. `createShadowRootUi({ anchor: '#center', position: 'inline' })` mounts the React
   tree; `assets/theme.css` injected into the shadow root.
3. `ThemeProvider` reads `surfaces/youtube/theme.ts`, sets the theme class on the
   container, and observes `<html>` for live changes.
4. User clicks `<Button>` trigger → Radix opens `ShadowPopover.Content`, portaled
   into the shadow root, positioned against the trigger.
5. Outside click → `onInteractOutside` → `isInsideShadowHost` guard decides keep/dismiss.
6. `wxt:locationchange` → re-run the mount guard; re-inject if the masthead was
   replaced.

## Error Handling

- Masthead / `#center` not found within timeout → `console.warn`, no throw; retried
  on next `wxt:locationchange` (preserves current behavior).
- Studio resolver probe missing the expected CSS variable → default to `'light'`
  and `console.warn` (so a wrong guess is visible, not silent).
- `ShadowPopover` with no provided shadow-root container → fall back to default
  Radix portal target and warn (degraded styling, not a crash).

## Testing (TDD — vitest + happy-dom)

Unit tests, written test-first:

- `lib/utils.ts` — `cn()` merge/dedupe behavior.
- `components/overlay/composedPath.ts` — `isInsideShadowHost` for paths that do and
  do not cross the host (the core of the PR #2433 workaround).
- `surfaces/youtube/theme.ts` — resolver returns `'dark'`/`'light'` from
  `html[dark]`.
- `surfaces/studio/theme.ts` — resolver maps probe values to a theme (with the TBD
  caveat encoded as the current best guess).
- `lib/theme/ThemeProvider` — class toggling + observer-driven live update (logic
  level; happy-dom).
- Surface registry descriptors — shape/validity.

Radix Portal rendering is unreliable under happy-dom; component-level overlay
behavior is verified **live in-browser**, not asserted in vitest. Keep automated
coverage on extracted pure logic.

`pnpm compile` (tsc `--noEmit`) and `pnpm test` must pass. No linter configured.

## Open Items / Risks

- **★ Studio theme signal (TBD):** resolver is a best guess until verified in a live
  Studio session. Tracked, not blocking the YouTube proving ground.
- **★ PR #2433 dependency:** the dismiss guard rides an unmerged Radix behavior;
  contained to `ShadowPopover` + `composedPath.ts` so a future swap (e.g. to
  `@floating-ui/react`) touches one place.
- **Masthead re-mount at `#center`:** the biggest behavioral change vs current
  `body`-overlay approach — must re-verify SPA navigation + button placement live.

## Out of scope for this spec

Studio features, additional shadcn components beyond `Button`/`Popover`, and any
non-overlay design-system work. Each future surface/feature gets its own
spec → plan → implementation cycle.
