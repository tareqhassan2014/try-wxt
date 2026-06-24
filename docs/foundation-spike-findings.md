# Spike: shadcn / Tailwind + Radix in a WXT shadow-root content script

**Branch:** `spike/shadcn-shadow-root` (throwaway)
**Goal:** De-risk a shared UI foundation for a 50+ feature extension across public
YouTube and YouTube Studio, before committing the architecture.

## What the spike builds

A Filter button + Radix Popover, both rendered **inside** the shadow root, mounted
into the YouTube masthead (`ytd-masthead #center`). Tailwind v4 styles, lucide icon,
popover content portaled into the shadow container, theme mirrored from YouTube.

Files: `spike.content.tsx`, `spike/SpikeApp.tsx`, `spike/style.css`, `spike/cn.ts`,
`postcss.config.mjs`, `wxt.config.ts` (Tailwind vite plugin).

> **Landed on `main`:** only this findings doc + the Tailwind toolchain config
> (`wxt.config.ts` Tailwind plugin, `postcss.config.mjs`, and the
> tailwindcss / @tailwindcss/vite / postcss-rem-to-responsive-pixel deps). The
> throwaway UI code (`spike.content.tsx`, `SpikeApp.tsx`, etc.) stays on branch
> `spike/shadcn-shadow-root` for reference and is intentionally not merged.

## The three unknowns — verdict

### 1. Tailwind v4 inside a WXT shadow root — ✅ WORKS
- `@tailwindcss/vite` + `@import "tailwindcss"` in a CSS imported by the content
  script + `cssInjectionMode: 'ui'` → WXT injects the generated CSS into the shadow
  root, not the page head. Build emits `spike.css` (~10.5 kB). Confirmed at build.
- **Gotcha fixed:** Tailwind emits `rem`, which resolves against the host page's
  `<html>` font-size — not the shadow root. YouTube overriding root font-size would
  break scaling. Fixed with `postcss-rem-to-responsive-pixel` (`postcss.config.mjs`).
- **Tailwind v4 bonus:** theme vars are emitted under `:root, :host`, so custom
  properties resolve inside shadow roots natively (v4 improvement over v3).
- **WXT `all: initial`** on the shadow host resets inherited props — set explicit
  font/color on the root component (done via Tailwind utilities).
- ⚠️ Verify in a live browser: classes actually render, no double-reset surprises.

### 2. Radix Popover, anchor + content across the shadow boundary — ⚠️ WORKS WITH WORKAROUND
- `Popover.Portal container={shadowContainer}` keeps content in the shadow root so it
  keeps Tailwind styles (default is `document.body`, which escapes). ✅
- Floating-UI positioning reads `getBoundingClientRect()` → works cross-boundary. ✅
- **Known bug (Radix PR #2433, UNMERGED as of 2026):** `DismissableLayer` uses
  `event.target` at the document level, which is the shadow **host** for any click in
  the shadow root. A trigger click can close-then-reopen / flash. We render the
  trigger inside the shadow root too, which reduces but does **not** eliminate this.
- **Workaround applied:** `onInteractOutside` checks `event.composedPath()` for the
  trigger and `preventDefault()`s the dismiss. Works only for `mode: 'open'` shadow
  roots (WXT default). Confirmed effective in the PR thread, but it's not an official
  fix. ⚠️ Must verify open/close/outside-click behavior live.
- **Robust fallback if it misbehaves:** use `@floating-ui/react` directly (what Radix
  uses internally) + our own `composedPath` outside-click — no DismissableLayer, full
  control across the boundary. Costs the convenience of Radix's a11y/focus handling.

### 3. YouTube Studio theme detection — ❌ UNRESOLVED, needs live probe
- Public YouTube: `document.documentElement.hasAttribute('dark')` — ✅ high confidence.
- Studio is a separate Polymer app (`ytcp-*`). No authoritative source confirms its
  dark signal. The popular Studio dark userstyle force-overrides, implying no easy
  native signal.
- **Robust fallback:** probe a CSS variable rather than guess the attribute, e.g.
  compare `getComputedStyle(document.documentElement).getPropertyValue('--yt-spec-base-background')`
  (dark `#0f0f0f` vs light `#fff` — verify exact values live).
- The masthead anchor here (`ytd-masthead #center`) does not exist on Studio, so the
  injection layer also needs per-surface anchors. Studio is its own integration.

## Implications for the 50-feature foundation

- **Tailwind-in-shadow is a solved, one-time setup** — safe to standardize.
- **Don't standardize on Radix overlays blindly.** The shadow-DOM overlay bugs are
  upstream and unmerged. Either (a) centralize the `composedPath` workaround in one
  shared `<Popover>`/`<Dialog>` wrapper so all 50 features inherit the fix, or (b)
  build the overlay layer on Floating UI directly. Decide before mass adoption.
- **Theme must be a per-surface abstraction** (`useYtTheme()`), not a copy-pasted
  `html[dark]` check — Studio differs and needs the CSS-var probe.
- **Injection/anchor must be a per-surface registry** — public `ytd-*` vs Studio
  `ytcp-*` anchors, with the SPA re-injection already proven on the feature branch.

## Recommendation

Tailwind + shadcn is viable and worth it at 50-feature scale. Adopt it, but wrap the
overlay primitives in one shared, shadow-DOM-aware component layer (centralizing the
PR #2433 workaround) and build a per-surface theme + anchor abstraction. Validate the
Radix workaround and the Studio CSS-var probe in a live browser before committing.

## Live-browser checklist (cannot be verified from build)

- [ ] Filter button renders Tailwind-styled in the masthead; popover opens styled.
- [ ] No rem-scaling distortion (sanity-check on a page that sets a custom root font).
- [ ] Trigger click opens, click again / outside closes — no flash/close-reopen.
- [ ] Popover positioned correctly relative to the button (Floating UI).
- [ ] Toggle YouTube theme → popover re-themes live.
- [ ] On `studio.youtube.com`: run the CSS-var probe to pin the dark signal.
