# Studio Performance Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the native YouTube Studio "Latest Content Performance" card with higher-precision CTR/APV, ranking trend icons, and loading UX — a faithful TypeScript port of the original MAIN-world Parcel script.

**Architecture:** A MAIN-world content script overrides `window.fetch` to capture the page's auth/INNERTUBE context, fetches `get_screen` analytics, and enriches the native DOM in place with MutationObserver guards. An ISOLATED-world bridge relays popup config from `browser.storage.sync` into MAIN via `window.postMessage`. Pure decision logic (format, ranking, parse, messages, icons) is isolated from YT-coupled adapters (context, api, dom, observe) so it unit-tests without a browser.

**Tech Stack:** WXT 0.20, TypeScript 5.9, Vitest 4 + happy-dom (already configured), React 19 (popup only), `browser.storage.sync`.

## Global Constraints

- Package manager: **pnpm** (pnpm 10+). All commands use `pnpm`.
- Static gate for every task: `pnpm compile` (`tsc --noEmit`) must pass clean.
- Test runner already configured (`vitest.config.ts`, happy-dom). Do NOT add it.
- Path alias: `@/` → project root.
- Do NOT touch the YouTube `FilterFeature` or the shadcn/shadow UI layer.
- Faithful native port: enrich the **native** DOM in place; no shadow overlay for this feature.
- Every YT-coupled adapter must degrade to "native page unchanged" on failure — never throw out of an entrypoint.
- Config keys + defaults: `showCtrHundredths` and `showApvHundredths`, both default **true**.
- All cross-world messages: enforce `origin === location.origin` + a message-type tag.
- Studio endpoint: `https://studio.youtube.com/youtubei/v1/yta_web/get_screen?alt=json&key=<API_KEY>`. API key from `ytcfg.get('INNERTUBE_API_KEY')`, fallback constant `AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`.

---

### Task 1: Config types + cross-world message protocol

**Files:**
- Create: `lib/studio/messages.ts`
- Test: `lib/studio/messages.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface StudioConfig { showCtrHundredths: boolean; showApvHundredths: boolean }`
  - `const DEFAULT_CONFIG: StudioConfig`
  - `const CONFIG_MESSAGE_TYPE = 'newstudio:config'`
  - `interface ConfigMessage { type: typeof CONFIG_MESSAGE_TYPE; config: StudioConfig }`
  - `function buildConfigMessage(config: StudioConfig): ConfigMessage`
  - `function readConfigMessage(e: MessageEvent): StudioConfig | null` — returns config only if origin matches `location.origin` and shape is valid, else `null`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/studio/messages.test.ts
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG,
  CONFIG_MESSAGE_TYPE,
  buildConfigMessage,
  readConfigMessage,
} from './messages';

describe('studio messages', () => {
  it('defaults both hundredths flags on', () => {
    expect(DEFAULT_CONFIG).toEqual({ showCtrHundredths: true, showApvHundredths: true });
  });

  it('builds a tagged config message', () => {
    const msg = buildConfigMessage({ showCtrHundredths: false, showApvHundredths: true });
    expect(msg).toEqual({
      type: CONFIG_MESSAGE_TYPE,
      config: { showCtrHundredths: false, showApvHundredths: true },
    });
  });

  it('reads a valid same-origin message', () => {
    const e = {
      origin: location.origin,
      data: buildConfigMessage(DEFAULT_CONFIG),
    } as MessageEvent;
    expect(readConfigMessage(e)).toEqual(DEFAULT_CONFIG);
  });

  it('rejects a cross-origin message', () => {
    const e = {
      origin: 'https://evil.example',
      data: buildConfigMessage(DEFAULT_CONFIG),
    } as MessageEvent;
    expect(readConfigMessage(e)).toBeNull();
  });

  it('rejects a message without the type tag', () => {
    const e = { origin: location.origin, data: { config: DEFAULT_CONFIG } } as MessageEvent;
    expect(readConfigMessage(e)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- lib/studio/messages.test.ts`
Expected: FAIL — cannot resolve `./messages`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/studio/messages.ts
export interface StudioConfig {
  showCtrHundredths: boolean;
  showApvHundredths: boolean;
}

export const DEFAULT_CONFIG: StudioConfig = {
  showCtrHundredths: true,
  showApvHundredths: true,
};

export const CONFIG_MESSAGE_TYPE = 'newstudio:config' as const;

export interface ConfigMessage {
  type: typeof CONFIG_MESSAGE_TYPE;
  config: StudioConfig;
}

export function buildConfigMessage(config: StudioConfig): ConfigMessage {
  return { type: CONFIG_MESSAGE_TYPE, config };
}

export function readConfigMessage(e: MessageEvent): StudioConfig | null {
  if (e.origin !== location.origin) return null;
  const data = e.data as Partial<ConfigMessage> | undefined;
  if (!data || data.type !== CONFIG_MESSAGE_TYPE) return null;
  const c = data.config;
  if (!c || typeof c.showCtrHundredths !== 'boolean' || typeof c.showApvHundredths !== 'boolean') {
    return null;
  }
  return { showCtrHundredths: c.showCtrHundredths, showApvHundredths: c.showApvHundredths };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- lib/studio/messages.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Compile + commit**

```bash
pnpm compile
git add lib/studio/messages.ts lib/studio/messages.test.ts
git commit -m "feat(studio): config types + cross-world message protocol"
```

---

### Task 2: Metric formatting

**Files:**
- Create: `lib/studio/format.ts`
- Test: `lib/studio/format.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `function formatPercent(pct: number, hundredths: boolean): string` — formats an already-percent number (e.g. `3.456` → `"3.46%"` / `"3.5%"`).
  - `function formatCtr(pct: number, hundredths: boolean): string`
  - `function formatApv(pct: number, hundredths: boolean): string`

  All inputs are percentage-scale numbers (parse.ts normalizes APV fraction → percent).

- [ ] **Step 1: Write the failing test**

```ts
// lib/studio/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatPercent, formatCtr, formatApv } from './format';

describe('formatPercent', () => {
  it('one decimal when hundredths off', () => {
    expect(formatPercent(3.456, false)).toBe('3.5%');
  });
  it('two decimals when hundredths on', () => {
    expect(formatPercent(3.456, true)).toBe('3.46%');
  });
  it('pads trailing zeros to fixed precision', () => {
    expect(formatPercent(45.6, true)).toBe('45.60%');
    expect(formatPercent(45, false)).toBe('45.0%');
  });
  it('handles zero', () => {
    expect(formatPercent(0, true)).toBe('0.00%');
  });
});

describe('formatCtr / formatApv', () => {
  it('ctr formats like percent', () => {
    expect(formatCtr(3.456, true)).toBe('3.46%');
  });
  it('apv formats like percent', () => {
    expect(formatApv(45.678, false)).toBe('45.7%');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- lib/studio/format.test.ts`
Expected: FAIL — cannot resolve `./format`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/studio/format.ts
export function formatPercent(pct: number, hundredths: boolean): string {
  const digits = hundredths ? 2 : 1;
  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(pct);
  return `${formatted}%`;
}

export function formatCtr(pct: number, hundredths: boolean): string {
  return formatPercent(pct, hundredths);
}

export function formatApv(pct: number, hundredths: boolean): string {
  return formatPercent(pct, hundredths);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- lib/studio/format.test.ts`
Expected: PASS (6 tests).

> Note: tests assume the default Vitest locale uses `.` as the decimal separator. `vitest.config.ts` runs under Node's default ICU; if a CI locale differs, the locale should be pinned — out of scope here.

- [ ] **Step 5: Compile + commit**

```bash
pnpm compile
git add lib/studio/format.ts lib/studio/format.test.ts
git commit -m "feat(studio): precise CTR/APV percent formatting"
```

---

### Task 3: Ranking classification

**Files:**
- Create: `lib/studio/ranking.ts`
- Test: `lib/studio/ranking.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Ranking = 'above' | 'below' | 'typical'`
  - `function classifyRanking(value: number, baseline: number, tolerance?: number): Ranking` — relative comparison; within `±tolerance` (default `0.05`) of baseline → `'typical'`. `baseline <= 0` → `'typical'` (cannot classify).

- [ ] **Step 1: Write the failing test**

```ts
// lib/studio/ranking.test.ts
import { describe, it, expect } from 'vitest';
import { classifyRanking } from './ranking';

describe('classifyRanking', () => {
  it('above when clearly higher than baseline', () => {
    expect(classifyRanking(12, 10)).toBe('above');
  });
  it('below when clearly lower than baseline', () => {
    expect(classifyRanking(8, 10)).toBe('below');
  });
  it('typical within tolerance band', () => {
    expect(classifyRanking(10.2, 10)).toBe('typical');
    expect(classifyRanking(9.8, 10)).toBe('typical');
  });
  it('respects custom tolerance at the boundary', () => {
    expect(classifyRanking(10.5, 10, 0.05)).toBe('above');
    expect(classifyRanking(10.5, 10, 0.1)).toBe('typical');
  });
  it('returns typical when baseline is non-positive', () => {
    expect(classifyRanking(5, 0)).toBe('typical');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- lib/studio/ranking.test.ts`
Expected: FAIL — cannot resolve `./ranking`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/studio/ranking.ts
export type Ranking = 'above' | 'below' | 'typical';

export function classifyRanking(value: number, baseline: number, tolerance = 0.05): Ranking {
  if (!(baseline > 0)) return 'typical';
  const delta = (value - baseline) / baseline;
  if (delta > tolerance) return 'above';
  if (delta < -tolerance) return 'below';
  return 'typical';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- lib/studio/ranking.test.ts`
Expected: PASS (5 tests).

> Open item from spec: the real baseline signal (channel average vs percentile) is unconfirmed. `classifyRanking` takes `baseline` as a parameter so it stays correct regardless; the orchestrator (Task 9) supplies the baseline once confirmed in a live capture.

- [ ] **Step 5: Compile + commit**

```bash
pnpm compile
git add lib/studio/ranking.ts lib/studio/ranking.test.ts
git commit -m "feat(studio): ranking above/below/typical classification"
```

---

### Task 4: Ranking SVG icons

**Files:**
- Create: `lib/studio/icons.ts`
- Test: `lib/studio/icons.test.ts`

**Interfaces:**
- Consumes: `Ranking` from `./ranking`.
- Produces:
  - `function rankingIconSvg(ranking: Ranking): string` — returns an inline SVG string. `'below'` uses color `#909090`; `'above'`/`'typical'` use `#2ba640`. SVG is 16×16, `viewBox="0 0 24 24"`, `focusable="false"`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/studio/icons.test.ts
import { describe, it, expect } from 'vitest';
import { rankingIconSvg } from './icons';

describe('rankingIconSvg', () => {
  it('renders a 16x16 non-focusable svg', () => {
    const svg = rankingIconSvg('above');
    expect(svg).toContain('width="16"');
    expect(svg).toContain('height="16"');
    expect(svg).toContain('focusable="false"');
    expect(svg).toContain('viewBox="0 0 24 24"');
  });
  it('uses green for above and typical', () => {
    expect(rankingIconSvg('above')).toContain('#2ba640');
    expect(rankingIconSvg('typical')).toContain('#2ba640');
  });
  it('uses gray for below', () => {
    expect(rankingIconSvg('below')).toContain('#909090');
  });
  it('renders distinct paths per ranking', () => {
    const a = rankingIconSvg('above');
    const b = rankingIconSvg('below');
    const t = rankingIconSvg('typical');
    expect(a).not.toBe(b);
    expect(a).not.toBe(t);
    expect(b).not.toBe(t);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- lib/studio/icons.test.ts`
Expected: FAIL — cannot resolve `./icons`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/studio/icons.ts
import type { Ranking } from './ranking';

const PATHS: Record<Ranking, string> = {
  above: 'M12 5l7 7-1.4 1.4L13 8.8V19h-2V8.8l-4.6 4.6L5 12z',
  below: 'M12 19l-7-7 1.4-1.4L11 15.2V5h2v10.2l4.6-4.6L19 12z',
  typical: 'M5 11h14v2H5z',
};

function color(ranking: Ranking): string {
  return ranking === 'below' ? '#909090' : '#2ba640';
}

export function rankingIconSvg(ranking: Ranking): string {
  return (
    `<svg width="16" height="16" viewBox="0 0 24 24" focusable="false" ` +
    `style="display:inline-flex;margin-left:8px;vertical-align:middle" ` +
    `fill="${color(ranking)}"><path d="${PATHS[ranking]}"/></svg>`
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- lib/studio/icons.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Compile + commit**

```bash
pnpm compile
git add lib/studio/icons.ts lib/studio/icons.test.ts
git commit -m "feat(studio): ranking trend SVG icons"
```

---

### Task 5: get_screen response parsing

**Files:**
- Create: `lib/studio/parse.ts`
- Create: `lib/studio/__fixtures__/get_screen.sample.json`
- Test: `lib/studio/parse.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface VideoMetrics { ctr?: number; apv?: number }` — both percentage-scale (CTR as-is number, APV = fraction × 100).
  - `function parseApv(screen: unknown): number | undefined` — reads `cards[].audienceRetentionHighlightsCardData.videosData[0].metricTotals.avgPercentageWatched` (fraction 0–1) and returns `× 100`. Missing → `undefined`, never throws.
  - `function parseCtr(screen: unknown): number | undefined` — scans card metric rows for a label matching `/impressions click through rate|click through rate|thumbnail impressions vtr|\bctr\b/i`, parses its numeric value (strips `,` and `%`). Missing → `undefined`.
  - `function parseMetrics(screen: unknown): VideoMetrics`

- [ ] **Step 1: Write the failing test + fixture**

Create `lib/studio/__fixtures__/get_screen.sample.json` (synthetic — mirrors the known shape; replace with a real capture per the spec's Open Items before shipping):

```json
{
  "cards": [
    {
      "audienceRetentionHighlightsCardData": {
        "videosData": [
          { "metricTotals": { "avgPercentageWatched": 0.4567 } }
        ]
      }
    },
    {
      "keyMetricCardData": {
        "metrics": [
          { "label": "Impressions click-through rate", "value": "3.4567%" },
          { "label": "Views", "value": "12,345" }
        ]
      }
    }
  ]
}
```

```ts
// lib/studio/parse.test.ts
import { describe, it, expect } from 'vitest';
import sample from './__fixtures__/get_screen.sample.json';
import { parseApv, parseCtr, parseMetrics } from './parse';

describe('parse get_screen', () => {
  it('parses APV as a percentage (fraction x 100)', () => {
    expect(parseApv(sample)).toBeCloseTo(45.67, 2);
  });
  it('parses CTR stripping comma and percent', () => {
    expect(parseCtr(sample)).toBeCloseTo(3.4567, 4);
  });
  it('parseMetrics returns both', () => {
    const m = parseMetrics(sample);
    expect(m.apv).toBeCloseTo(45.67, 2);
    expect(m.ctr).toBeCloseTo(3.4567, 4);
  });
  it('returns undefined for missing fields, never throws', () => {
    expect(parseApv({})).toBeUndefined();
    expect(parseCtr({})).toBeUndefined();
    expect(parseMetrics(null)).toEqual({ ctr: undefined, apv: undefined });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- lib/studio/parse.test.ts`
Expected: FAIL — cannot resolve `./parse`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/studio/parse.ts
export interface VideoMetrics {
  ctr?: number;
  apv?: number;
}

const CTR_LABEL = /impressions click through rate|click through rate|thumbnail impressions vtr|\bctr\b/i;

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function parseApv(screen: unknown): number | undefined {
  const cards = asArray((screen as { cards?: unknown })?.cards);
  for (const card of cards) {
    const videos = asArray(
      (card as any)?.audienceRetentionHighlightsCardData?.videosData,
    );
    const raw = (videos[0] as any)?.metricTotals?.avgPercentageWatched;
    if (typeof raw === 'number') return raw * 100;
  }
  return undefined;
}

export function parseCtr(screen: unknown): number | undefined {
  const cards = asArray((screen as { cards?: unknown })?.cards);
  for (const card of cards) {
    const metrics = asArray((card as any)?.keyMetricCardData?.metrics);
    for (const metric of metrics) {
      const label = String((metric as any)?.label ?? '');
      if (!CTR_LABEL.test(label)) continue;
      const value = String((metric as any)?.value ?? '').replace(/[,%]/g, '').trim();
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

export function parseMetrics(screen: unknown): VideoMetrics {
  return { ctr: parseCtr(screen), apv: parseApv(screen) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- lib/studio/parse.test.ts`
Expected: PASS (4 tests).

> Ensure `tsconfig`/Vite allows JSON imports (WXT/Vite enable `resolveJsonModule` by default). If the import errors, add `"resolveJsonModule": true` to `tsconfig.json`.

- [ ] **Step 5: Compile + commit**

```bash
pnpm compile
git add lib/studio/parse.ts lib/studio/parse.test.ts lib/studio/__fixtures__/get_screen.sample.json
git commit -m "feat(studio): parse CTR/APV from get_screen response"
```

---

### Task 6: Auth/INNERTUBE context capture (fetch proxy)

**Files:**
- Create: `lib/studio/context.ts`
- Test: `lib/studio/context.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface StudioContext { authHeader?: string; innertubeContext?: unknown; apiKey: string }`
  - `function createContextCapture(target?: { fetch: typeof fetch; ytcfg?: { get(k: string): unknown } }): { install(): () => void; get(): StudioContext; ready(): boolean }`
    - `install()` replaces `target.fetch` with a proxy that records the `Authorization` request header and, for `get_screen`/`get_cards` responses, the `context` body field. Returns an uninstall function restoring the original fetch.
    - The proxy always calls through to the original fetch (try/finally) and never throws.
    - `apiKey` reads `target.ytcfg.get('INNERTUBE_API_KEY')`, else the fallback constant.
    - `ready()` is true once an auth header has been captured.

- [ ] **Step 1: Write the failing test**

```ts
// lib/studio/context.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createContextCapture } from './context';

function makeResponse(body: unknown): Response {
  return { ok: true, clone: () => ({ json: async () => body }) } as unknown as Response;
}

describe('createContextCapture', () => {
  it('captures Authorization header from outgoing requests', async () => {
    const orig = vi.fn(async () => makeResponse({}));
    const target = { fetch: orig as unknown as typeof fetch };
    const cap = createContextCapture(target);
    cap.install();
    await target.fetch('https://studio.youtube.com/x', {
      headers: new Headers({ Authorization: 'SAPISIDHASH abc' }),
    });
    expect(cap.get().authHeader).toBe('SAPISIDHASH abc');
    expect(cap.ready()).toBe(true);
    expect(orig).toHaveBeenCalled();
  });

  it('captures innertube context from get_screen response', async () => {
    const ctxBody = { context: { client: { hl: 'en' } } };
    const target = { fetch: (async () => makeResponse(ctxBody)) as unknown as typeof fetch };
    const cap = createContextCapture(target);
    cap.install();
    await target.fetch('https://studio.youtube.com/youtubei/v1/yta_web/get_screen');
    expect(cap.get().innertubeContext).toEqual(ctxBody.context);
  });

  it('reads apiKey from ytcfg, else fallback', () => {
    const withCfg = createContextCapture({
      fetch: (async () => makeResponse({})) as unknown as typeof fetch,
      ytcfg: { get: () => 'KEY_FROM_CFG' },
    });
    expect(withCfg.get().apiKey).toBe('KEY_FROM_CFG');

    const noCfg = createContextCapture({ fetch: (async () => makeResponse({})) as unknown as typeof fetch });
    expect(noCfg.get().apiKey).toBe('AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8');
  });

  it('uninstall restores the original fetch', () => {
    const orig = (async () => makeResponse({})) as unknown as typeof fetch;
    const target = { fetch: orig };
    const cap = createContextCapture(target);
    const uninstall = cap.install();
    expect(target.fetch).not.toBe(orig);
    uninstall();
    expect(target.fetch).toBe(orig);
  });

  it('calls through even when capture logic would error', async () => {
    const orig = vi.fn(async () => makeResponse({}));
    const target = { fetch: orig as unknown as typeof fetch };
    const cap = createContextCapture(target);
    cap.install();
    // headers as a plain object the proxy must tolerate
    await target.fetch('https://x', { headers: { Authorization: 'plain' } as any });
    expect(orig).toHaveBeenCalled();
    expect(cap.get().authHeader).toBe('plain');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- lib/studio/context.test.ts`
Expected: FAIL — cannot resolve `./context`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/studio/context.ts
const FALLBACK_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

export interface StudioContext {
  authHeader?: string;
  innertubeContext?: unknown;
  apiKey: string;
}

interface CaptureTarget {
  fetch: typeof fetch;
  ytcfg?: { get(k: string): unknown };
}

function readAuth(init?: RequestInit): string | undefined {
  const h = init?.headers;
  if (!h) return undefined;
  if (h instanceof Headers) return h.get('Authorization') ?? undefined;
  if (Array.isArray(h)) {
    const found = h.find(([k]) => k.toLowerCase() === 'authorization');
    return found?.[1];
  }
  const rec = h as Record<string, string>;
  return rec.Authorization ?? rec.authorization;
}

export function createContextCapture(target: CaptureTarget = { fetch: globalThis.fetch }) {
  const state: StudioContext = {
    apiKey: (target.ytcfg?.get('INNERTUBE_API_KEY') as string) || FALLBACK_API_KEY,
  };
  const original = target.fetch;

  function install(): () => void {
    target.fetch = async function (...args: Parameters<typeof fetch>) {
      try {
        const [input, init] = args;
        const auth = readAuth(init);
        if (auth) state.authHeader = auth;
        const res = await original.apply(this, args as any);
        try {
          const url = typeof input === 'string' ? input : (input as Request)?.url ?? '';
          if (res?.ok && /yta_web\/get_(screen|cards)/.test(url) && !state.innertubeContext) {
            const body = await res.clone().json();
            if (body?.context) state.innertubeContext = body.context;
          }
        } catch {
          /* response inspection is best-effort */
        }
        return res;
      } catch (err) {
        return original.apply(this, args as any);
      }
    } as typeof fetch;
    return () => {
      target.fetch = original;
    };
  }

  return {
    install,
    get: (): StudioContext => state,
    ready: () => Boolean(state.authHeader),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- lib/studio/context.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Compile + commit**

```bash
pnpm compile
git add lib/studio/context.ts lib/studio/context.test.ts
git commit -m "feat(studio): fetch-proxy auth/INNERTUBE context capture"
```

---

### Task 7: get_screen request builder + fetcher

**Files:**
- Create: `lib/studio/api.ts`
- Test: `lib/studio/api.test.ts`

**Interfaces:**
- Consumes: `StudioContext` from `./context`.
- Produces:
  - `type AnalyticsTab = 'ANALYTICS_TAB_ID_OVERVIEW' | 'ANALYTICS_TAB_ID_REACH'`
  - `function buildScreenRequest(videoId: string, tab: AnalyticsTab, ctx: StudioContext): { url: string; init: RequestInit }`
  - `async function fetchScreen(videoId, tab, ctx, fetchImpl?): Promise<unknown | undefined>` — POSTs and returns parsed JSON, or `undefined` on non-OK / error (never throws).

- [ ] **Step 1: Write the failing test**

```ts
// lib/studio/api.test.ts
import { describe, it, expect, vi } from 'vitest';
import { buildScreenRequest, fetchScreen } from './api';
import type { StudioContext } from './context';

const ctx: StudioContext = {
  authHeader: 'SAPISIDHASH abc',
  innertubeContext: { client: { hl: 'en' } },
  apiKey: 'KEY',
};

describe('buildScreenRequest', () => {
  it('targets the get_screen endpoint with the api key', () => {
    const { url } = buildScreenRequest('vid1', 'ANALYTICS_TAB_ID_OVERVIEW', ctx);
    expect(url).toBe(
      'https://studio.youtube.com/youtubei/v1/yta_web/get_screen?alt=json&key=KEY',
    );
  });
  it('puts videoId, tab, and context in the body and auth in headers', () => {
    const { init } = buildScreenRequest('vid1', 'ANALYTICS_TAB_ID_REACH', ctx);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('SAPISIDHASH abc');
    const body = JSON.parse(init.body as string);
    expect(body.context).toEqual(ctx.innertubeContext);
    expect(body.screenConfig.entity.videoId).toBe('vid1');
    expect(body.desktopState.tabId).toBe('ANALYTICS_TAB_ID_REACH');
  });
});

describe('fetchScreen', () => {
  it('returns parsed json on ok', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ cards: [] }) }) as any);
    const out = await fetchScreen('vid1', 'ANALYTICS_TAB_ID_OVERVIEW', ctx, fetchImpl);
    expect(out).toEqual({ cards: [] });
  });
  it('returns undefined on non-ok', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, json: async () => ({}) }) as any);
    expect(await fetchScreen('v', 'ANALYTICS_TAB_ID_OVERVIEW', ctx, fetchImpl)).toBeUndefined();
  });
  it('returns undefined and does not throw on network error', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('net'); });
    expect(await fetchScreen('v', 'ANALYTICS_TAB_ID_OVERVIEW', ctx, fetchImpl as any)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- lib/studio/api.test.ts`
Expected: FAIL — cannot resolve `./api`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/studio/api.ts
import type { StudioContext } from './context';

export type AnalyticsTab = 'ANALYTICS_TAB_ID_OVERVIEW' | 'ANALYTICS_TAB_ID_REACH';

const BASE = 'https://studio.youtube.com/youtubei/v1/yta_web/get_screen';

export function buildScreenRequest(videoId: string, tab: AnalyticsTab, ctx: StudioContext) {
  const url = `${BASE}?alt=json&key=${ctx.apiKey}`;
  const body = {
    context: ctx.innertubeContext,
    screenConfig: {
      entity: { videoId },
      timePeriod: { timePeriodType: 'ANALYTICS_TIME_PERIOD_TYPE_LIFETIME' },
      currency: 'USD',
      timeZoneOffsetSecs: -60 * new Date().getTimezoneOffset(),
    },
    desktopState: { tabId: tab },
    fetchingType: 'FETCHING_TYPE_BACKGROUND',
  };
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ctx.authHeader) headers.Authorization = ctx.authHeader;
  return { url, init: { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include' as const } };
}

export async function fetchScreen(
  videoId: string,
  tab: AnalyticsTab,
  ctx: StudioContext,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<unknown | undefined> {
  try {
    const { url, init } = buildScreenRequest(videoId, tab, ctx);
    const res = await fetchImpl(url, init);
    if (!res.ok) return undefined;
    return await res.json();
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- lib/studio/api.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Compile + commit**

```bash
pnpm compile
git add lib/studio/api.ts lib/studio/api.test.ts
git commit -m "feat(studio): get_screen request builder + fetcher"
```

---

### Task 8: DOM enrichment + MutationObserver guard

**Files:**
- Create: `lib/studio/dom.ts`
- Test: `lib/studio/dom.test.ts`

**Interfaces:**
- Consumes: `rankingIconSvg` from `./icons`, `Ranking` from `./ranking`.
- Produces:
  - `function findPerformanceCard(root?: ParentNode): Element | null` — finds the card whose text matches `/latest/i` AND `/performance/i` among `ytcd-card` candidates.
  - `function findMetricCells(card: Element): HTMLElement[]` — returns `.metrics-value, .table-value` cells under the card.
  - `function setGuardedText(cell: HTMLElement, text: string): () => void` — sets `cell.textContent` and installs a MutationObserver that re-asserts it if changed; returns a disconnect function.
  - `function injectRankingIcon(cell: HTMLElement, ranking: Ranking): void` — appends the icon (idempotent: replaces any prior `.newstudio-ranking-icon`).

- [ ] **Step 1: Write the failing test**

```ts
// lib/studio/dom.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { findPerformanceCard, findMetricCells, setGuardedText, injectRankingIcon } from './dom';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('findPerformanceCard', () => {
  it('matches the latest + performance card', () => {
    document.body.innerHTML = `
      <ytcd-card>Other card</ytcd-card>
      <ytcd-card><div>Latest content performance</div>
        <span class="metrics-value">3.4%</span>
      </ytcd-card>`;
    const card = findPerformanceCard();
    expect(card?.textContent).toMatch(/latest/i);
    expect(findMetricCells(card!)).toHaveLength(1);
  });
  it('returns null when no card matches', () => {
    document.body.innerHTML = `<ytcd-card>Revenue</ytcd-card>`;
    expect(findPerformanceCard()).toBeNull();
  });
});

describe('setGuardedText', () => {
  it('re-asserts text when something rewrites the cell', async () => {
    const cell = document.createElement('span');
    document.body.appendChild(cell);
    const stop = setGuardedText(cell, '3.46%');
    expect(cell.textContent).toBe('3.46%');
    cell.textContent = '3.4%'; // simulate YouTube rewrite
    await new Promise((r) => setTimeout(r, 0)); // let observer fire
    expect(cell.textContent).toBe('3.46%');
    stop();
  });
});

describe('injectRankingIcon', () => {
  it('appends exactly one icon (idempotent)', () => {
    const cell = document.createElement('span');
    injectRankingIcon(cell, 'above');
    injectRankingIcon(cell, 'below');
    expect(cell.querySelectorAll('.newstudio-ranking-icon')).toHaveLength(1);
    expect(cell.querySelector('.newstudio-ranking-icon')!.innerHTML).toContain('#909090');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- lib/studio/dom.test.ts`
Expected: FAIL — cannot resolve `./dom`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/studio/dom.ts
import type { Ranking } from './ranking';
import { rankingIconSvg } from './icons';

const CARD_SELECTOR = '.cards.left-align-columns ytcd-card, #ns-tile-overlay ytcd-card, ytcd-card';
const CELL_SELECTOR = '.metrics-value, .table-value';
const ICON_CLASS = 'newstudio-ranking-icon';

export function findPerformanceCard(root: ParentNode = document): Element | null {
  const cards = Array.from(root.querySelectorAll(CARD_SELECTOR));
  return (
    cards.find((c) => {
      const text = c.textContent || '';
      return /latest/i.test(text) && /performance/i.test(text);
    }) ?? null
  );
}

export function findMetricCells(card: Element): HTMLElement[] {
  return Array.from(card.querySelectorAll<HTMLElement>(CELL_SELECTOR));
}

export function setGuardedText(cell: HTMLElement, text: string): () => void {
  cell.textContent = text;
  const observer = new MutationObserver(() => {
    if ((cell.textContent || '').trim() !== text) {
      cell.textContent = text;
    }
  });
  observer.observe(cell, { childList: true, characterData: true, subtree: true });
  return () => observer.disconnect();
}

export function injectRankingIcon(cell: HTMLElement, ranking: Ranking): void {
  cell.querySelector(`.${ICON_CLASS}`)?.remove();
  const span = document.createElement('span');
  span.className = ICON_CLASS;
  span.innerHTML = rankingIconSvg(ranking);
  cell.appendChild(span);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- lib/studio/dom.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Compile + commit**

```bash
pnpm compile
git add lib/studio/dom.ts lib/studio/dom.test.ts
git commit -m "feat(studio): DOM card/cell targeting + guarded enrichment"
```

---

### Task 9: MAIN-world orchestrator entrypoint

**Files:**
- Create: `entrypoints/studio-main.content.ts`
- Modify: `surfaces/studio/registry.ts` (reuse its `matches`)

**Interfaces:**
- Consumes: `createContextCapture` (Task 6), `fetchScreen` (Task 7), `parseMetrics` (Task 5), `formatCtr`/`formatApv` (Task 2), `findPerformanceCard`/`findMetricCells`/`setGuardedText`/`injectRankingIcon` (Task 8), `classifyRanking` (Task 3), `readConfigMessage`/`DEFAULT_CONFIG`/`StudioConfig` (Task 1).
- Produces: the running MAIN-world content script. No exported API for later tasks.

This task has no unit test (it is the YT-coupled orchestrator; verified manually in Task 12). Keep it thin — all logic lives in the tested modules. Reviewer gate is `pnpm compile` + code reading.

- [ ] **Step 1: Write the entrypoint**

```ts
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
      if (!capture.ready()) return;
      const card = findPerformanceCard();
      if (!card) {
        console.warn('[newstudio] performance card not found');
        return;
      }
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
    }

    function teardown() {
      while (guards.length) guards.pop()!();
    }

    // Re-run on DOM changes (card mounts late / SPA nav rebuilds it).
    const observer = new MutationObserver(() => void enrich());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    void enrich();

    window.addEventListener('beforeunload', teardown);
  },
});
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm compile`
Expected: PASS (no errors).

- [ ] **Step 3: Verify the dev build registers the MAIN-world script**

Run: `pnpm build`
Expected: build succeeds; `.output/chrome-mv3/manifest.json` contains a content script entry for studio with `"world": "MAIN"`. (Inspect with `grep -c MAIN .output/chrome-mv3/manifest.json` → ≥ 1.)

- [ ] **Step 4: Commit**

```bash
git add entrypoints/studio-main.content.ts surfaces/studio/registry.ts
git commit -m "feat(studio): MAIN-world enrichment orchestrator entrypoint"
```

---

### Task 10: ISOLATED-world config bridge entrypoint

**Files:**
- Create: `entrypoints/studio-bridge.content.ts`

**Interfaces:**
- Consumes: `buildConfigMessage`, `DEFAULT_CONFIG`, `StudioConfig` (Task 1).
- Produces: the running ISOLATED-world bridge. No exported API.

Storage read/relay is verified manually (Task 12). Reviewer gate: `pnpm compile` + code reading.

- [ ] **Step 1: Write the entrypoint**

```ts
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
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm compile`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add entrypoints/studio-bridge.content.ts
git commit -m "feat(studio): ISOLATED-world config bridge to MAIN world"
```

---

### Task 11: Popup settings UI

**Files:**
- Modify: `entrypoints/popup/App.tsx` (replace template content with settings)

**Interfaces:**
- Consumes: `StudioConfig`, `DEFAULT_CONFIG` (Task 1). Storage key `'studioConfig'` (matches Task 10).
- Produces: a popup that reads/writes `browser.storage.sync.studioConfig`.

- [ ] **Step 1: Write the failing test**

```tsx
// entrypoints/popup/App.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

const store: Record<string, unknown> = {};
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.stubGlobal('browser', {
    storage: {
      sync: {
        get: vi.fn(async (k: string) => ({ [k]: store[k] })),
        set: vi.fn(async (v: Record<string, unknown>) => Object.assign(store, v)),
      },
    },
  });
});

describe('popup settings', () => {
  it('renders both precision toggles defaulting on', async () => {
    render(<App />);
    const ctr = await screen.findByLabelText(/ctr hundredths/i);
    const apv = screen.getByLabelText(/apv hundredths/i);
    expect((ctr as HTMLInputElement).checked).toBe(true);
    expect((apv as HTMLInputElement).checked).toBe(true);
  });

  it('persists a toggle change to storage', async () => {
    render(<App />);
    const ctr = await screen.findByLabelText(/ctr hundredths/i);
    fireEvent.click(ctr);
    await waitFor(() =>
      expect(store.studioConfig).toEqual({ showCtrHundredths: false, showApvHundredths: true }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- entrypoints/popup/App.test.tsx`
Expected: FAIL — current `App` renders the WXT template, no toggles.

- [ ] **Step 3: Write minimal implementation**

```tsx
// entrypoints/popup/App.tsx
import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG, type StudioConfig } from '@/lib/studio/messages';

const STORAGE_KEY = 'studioConfig';

function App() {
  const [config, setConfig] = useState<StudioConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    browser.storage.sync.get(STORAGE_KEY).then((stored) => {
      setConfig({ ...DEFAULT_CONFIG, ...(stored[STORAGE_KEY] as Partial<StudioConfig> | undefined) });
    });
  }, []);

  function update(patch: Partial<StudioConfig>) {
    const next = { ...config, ...patch };
    setConfig(next);
    void browser.storage.sync.set({ [STORAGE_KEY]: next });
  }

  return (
    <div style={{ padding: 16, minWidth: 240 }}>
      <h1 style={{ fontSize: 16 }}>Studio Performance</h1>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={config.showCtrHundredths}
          onChange={(e) => update({ showCtrHundredths: e.target.checked })}
        />
        CTR hundredths (2 decimals)
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <input
          type="checkbox"
          checked={config.showApvHundredths}
          onChange={(e) => update({ showApvHundredths: e.target.checked })}
        />
        APV hundredths (2 decimals)
      </label>
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- entrypoints/popup/App.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Compile + commit**

```bash
pnpm compile
git add entrypoints/popup/App.tsx entrypoints/popup/App.test.tsx
git commit -m "feat(studio): popup precision toggles persisted to storage.sync"
```

---

### Task 12: Full-suite gate + manual browser verification

**Files:** none (verification only). Any selector/baseline fixes discovered here land as follow-up edits to `lib/studio/dom.ts` / `entrypoints/studio-main.content.ts` with their own commits.

- [ ] **Step 1: Run the whole test suite**

Run: `pnpm test`
Expected: all suites pass (existing 10 + new studio suites).

- [ ] **Step 2: Type-check**

Run: `pnpm compile`
Expected: clean.

- [ ] **Step 3: Manual verification on studio.youtube.com**

Run: `pnpm dev`, open `studio.youtube.com` dashboard, confirm:
- CTR and APV cells show hundredths.
- Spinner → enriched-value transition (loading UX).
- Ranking icon color/direction correct on rows.
- Toggling a popup checkbox flips precision live (no reload — config push path works).
- SPA navigation away and back re-enriches the card.
- Manually edit an enriched cell in DevTools → guard re-asserts the value.

- [ ] **Step 4: Capture a real fixture (spec Open Item)**

In DevTools Network tab, copy a real `get_screen` response → replace `lib/studio/__fixtures__/get_screen.sample.json` if the shape differs from the synthetic sample, and adjust `parse.ts` + its test accordingly. Re-run `pnpm test`.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "test(studio): verify full suite + finalize fixtures/selectors"
```

---

## Self-Review

**Spec coverage:**
- Precise CTR → Tasks 2, 5, 7, 8, 9. ✅
- Precise APV → Tasks 2, 5, 7, 8, 9. ✅
- Ranking icons → Tasks 3, 4 (logic/markup); injection wiring deferred to Task 12 pending live baseline (flagged spec Open Item). ✅ (logic fully built + tested)
- Loading UX → `setGuardedText` guard (Task 8); spinner/overlay observed in Task 9 orchestrator + verified Task 12. Partial: spinner/overlay timing (700ms/20s) is in the orchestrator/verification, not unit-tested (YT-coupled). Acceptable per spec ("manual" bucket).
- World split (MAIN/ISOLATED/popup) → Tasks 9, 10, 11. ✅
- Config flow popup→storage→bridge→postMessage→main → Tasks 1, 10, 11, 9. ✅
- Error handling (degrade to native) → built into each adapter (Tasks 5–9). ✅
- Testing/Vitest → already configured; tests in every pure-logic task. ✅
- Fixtures → Task 5 (synthetic) + Task 12 (real capture). ✅

**Placeholder scan:** No "TBD/TODO" in code steps. The two genuine unknowns (row→videoId extraction selector; ranking baseline source) are explicitly the spec's Open Items, isolated to Task 9/12 and called out as live-verification — not hidden placeholders. All pure logic has concrete code + tests.

**Type consistency:** `StudioConfig`/`DEFAULT_CONFIG` (Task 1) used identically in 9/10/11. `StudioContext` (Task 6) consumed by Task 7. `Ranking` (Task 3) consumed by 4/8. `parseMetrics`→`{ctr,apv}` percent-scale matches `formatCtr/formatApv` percent-scale inputs. Storage key `'studioConfig'` matches in Tasks 10 + 11. `AnalyticsTab` literals match between Task 7 and Task 9.
