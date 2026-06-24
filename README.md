# WXT + React

Browser extension built with [WXT](https://wxt.dev), React 19, and TypeScript. Targets Chrome and Firefox.

## Prerequisites

- [pnpm](https://pnpm.io) 10+
- Node.js 18+

## Setup

```sh
pnpm install
```

## Development

```sh
pnpm dev          # Chrome dev server with HMR
pnpm dev:firefox  # Firefox dev server
```

WXT launches the browser with the extension loaded and reloads on save.

## Build

```sh
pnpm build          # production build → .output/
pnpm build:firefox  # Firefox build
pnpm zip            # package for Chrome Web Store
pnpm zip:firefox    # package for Firefox Add-ons
```

## Type check

```sh
pnpm compile  # tsc --noEmit
```

## Project structure

```
entrypoints/
  background.ts     # service worker
  content.ts        # content script (matches *://*.google.com/*)
  popup/            # React popup UI
assets/             # bundled assets (import via @/)
public/             # static files served at root (/)
wxt.config.ts       # WXT config
```

WXT generates the manifest from `entrypoints/` by convention — no manual manifest editing. `defineBackground`, `defineContentScript`, and `browser` are auto-imported globals.

## Docs

- [WXT](https://wxt.dev)
- [React](https://react.dev)
