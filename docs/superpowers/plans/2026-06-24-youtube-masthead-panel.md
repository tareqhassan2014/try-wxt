# YouTube Masthead Button + Toggle Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a button to the YouTube masthead that toggles an isolated, custom panel; runs only on YouTube.

**Architecture:** A single WXT content script (`*://*.youtube.com/*`) injects a plain DOM button into YouTube's masthead and mounts a React panel inside a shadow root for style isolation. A small framework-agnostic toggle store is the single source of truth: the button calls `toggle()`, the panel subscribes and re-renders.

**Tech Stack:** WXT 0.20, React 19, TypeScript, plain scoped CSS. Tests via Vitest + happy-dom with the `WxtVitest` plugin.

## Global Constraints

- Package manager: **pnpm** (10+). Build-script policy lives in `pnpm-workspace.yaml`, not `package.json`.
- Content script matches **only** `*://*.youtube.com/*`.
- Style isolation is mandatory: panel renders in a shadow root (`cssInjectionMode: 'ui'`).
- No Tailwind/shadcn. Plain scoped CSS only.
- WXT auto-imports `defineContentScript`, `createShadowRootUi`, `browser` — do not add import statements for these.
- The existing `entrypoints/content.ts` (google.com demo) is starter boilerplate — remove it.

---

### Task 1: Set up Vitest test harness

**Files:**
- Modify: `package.json` (add devDeps + `test` script)
- Create: `vitest.config.ts`
- Test: `entrypoints/youtube/sanity.test.ts` (temporary, deleted in Step 6)

**Interfaces:**
- Consumes: nothing.
- Produces: a working `pnpm test` command and a Vitest environment with DOM + `MutationObserver` (happy-dom) and WXT auto-imports.

- [ ] **Step 1: Install dev dependencies**

```bash
pnpm add -D vitest happy-dom
```

- [ ] **Step 2: Add the test script to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing';

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    environment: 'happy-dom',
  },
});
```

- [ ] **Step 4: Write a sanity test**

Create `entrypoints/youtube/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
  it('has a DOM with MutationObserver', () => {
    expect(typeof document).toBe('object');
    expect(typeof MutationObserver).toBe('function');
  });
});
```

- [ ] **Step 5: Run the test to verify the harness works**

Run: `pnpm test --run`
Expected: PASS, 1 test passing.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts entrypoints/youtube/sanity.test.ts
git commit -m "test: add vitest + happy-dom harness"
```

---

### Task 2: `waitForElement` helper

YouTube hydrates the masthead asynchronously. This helper resolves once a selector appears, or `null` after a timeout.

**Files:**
- Create: `entrypoints/youtube/waitForElement.ts`
- Test: `entrypoints/youtube/waitForElement.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `waitForElement(selector: string, opts?: { timeout?: number; root?: Document }): Promise<Element | null>`.

- [ ] **Step 1: Write the failing test**

Create `entrypoints/youtube/waitForElement.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitForElement } from './waitForElement';

describe('waitForElement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('resolves immediately when the element already exists', async () => {
    document.body.innerHTML = '<div id="target"></div>';
    const el = await waitForElement('#target');
    expect(el).not.toBeNull();
    expect(el!.id).toBe('target');
  });

  it('resolves once the element is added later', async () => {
    const promise = waitForElement('#late');
    queueMicrotask(() => {
      const div = document.createElement('div');
      div.id = 'late';
      document.body.appendChild(div);
    });
    const el = await promise;
    expect(el!.id).toBe('late');
  });

  it('resolves null after the timeout when the element never appears', async () => {
    vi.useFakeTimers();
    const promise = waitForElement('#never', { timeout: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    const el = await promise;
    expect(el).toBeNull();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run waitForElement`
Expected: FAIL — cannot resolve `./waitForElement`.

- [ ] **Step 3: Write the implementation**

Create `entrypoints/youtube/waitForElement.ts`:

```ts
export interface WaitForElementOptions {
  timeout?: number;
  root?: Document;
}

export function waitForElement(
  selector: string,
  { timeout = 10000, root = document }: WaitForElementOptions = {},
): Promise<Element | null> {
  const existing = root.querySelector(selector);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const el = root.querySelector(selector);
      if (el) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(el);
      }
    });

    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);

    observer.observe(root.documentElement, { childList: true, subtree: true });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --run waitForElement`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add entrypoints/youtube/waitForElement.ts entrypoints/youtube/waitForElement.test.ts
git commit -m "feat: add waitForElement helper"
```

---

### Task 3: `toggleState` store

Framework-agnostic open/close state. Single source of truth shared by the button (writes) and the panel (subscribes).

**Files:**
- Create: `entrypoints/youtube/toggleState.ts`
- Test: `entrypoints/youtube/toggleState.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ToggleState = { get(): boolean; set(value: boolean): void; toggle(): void; subscribe(listener: (open: boolean) => void): () => void }`
  - `createToggleState(initial?: boolean): ToggleState`

- [ ] **Step 1: Write the failing test**

Create `entrypoints/youtube/toggleState.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { createToggleState } from './toggleState';

describe('createToggleState', () => {
  it('starts closed by default', () => {
    expect(createToggleState().get()).toBe(false);
  });

  it('honors the initial value', () => {
    expect(createToggleState(true).get()).toBe(true);
  });

  it('toggle() flips the value and notifies subscribers', () => {
    const state = createToggleState();
    const listener = vi.fn();
    state.subscribe(listener);
    state.toggle();
    expect(state.get()).toBe(true);
    expect(listener).toHaveBeenCalledWith(true);
  });

  it('set() updates the value and notifies subscribers', () => {
    const state = createToggleState(true);
    const listener = vi.fn();
    state.subscribe(listener);
    state.set(false);
    expect(state.get()).toBe(false);
    expect(listener).toHaveBeenCalledWith(false);
  });

  it('unsubscribe stops notifications', () => {
    const state = createToggleState();
    const listener = vi.fn();
    const unsubscribe = state.subscribe(listener);
    unsubscribe();
    state.toggle();
    expect(listener).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run toggleState`
Expected: FAIL — cannot resolve `./toggleState`.

- [ ] **Step 3: Write the implementation**

Create `entrypoints/youtube/toggleState.ts`:

```ts
export type ToggleListener = (open: boolean) => void;

export interface ToggleState {
  get(): boolean;
  set(value: boolean): void;
  toggle(): void;
  subscribe(listener: ToggleListener): () => void;
}

export function createToggleState(initial = false): ToggleState {
  let open = initial;
  const listeners = new Set<ToggleListener>();
  const emit = () => listeners.forEach((listener) => listener(open));

  return {
    get: () => open,
    set(value) {
      open = value;
      emit();
    },
    toggle() {
      open = !open;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --run toggleState`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add entrypoints/youtube/toggleState.ts entrypoints/youtube/toggleState.test.ts
git commit -m "feat: add toggleState store"
```

---

### Task 4: Button builder + injection guard

Creates the masthead button and injects it once, guarding against duplicates across SPA re-runs.

**Files:**
- Create: `entrypoints/youtube/button.ts`
- Test: `entrypoints/youtube/button.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `PANEL_BUTTON_ID: string`
  - `createPanelButton(onClick: () => void): HTMLButtonElement`
  - `injectButton(masthead: Element, onClick: () => void): HTMLButtonElement | null` — returns `null` if a button is already present.

- [ ] **Step 1: Write the failing test**

Create `entrypoints/youtube/button.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PANEL_BUTTON_ID, createPanelButton, injectButton } from './button';

describe('createPanelButton', () => {
  it('builds a button with the marker id and wires the click handler', () => {
    const onClick = vi.fn();
    const button = createPanelButton(onClick);
    expect(button.id).toBe(PANEL_BUTTON_ID);
    button.click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('injectButton', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('inserts the button into the masthead', () => {
    const masthead = document.createElement('div');
    document.body.appendChild(masthead);
    const button = injectButton(masthead, vi.fn());
    expect(button).not.toBeNull();
    expect(masthead.querySelector(`#${PANEL_BUTTON_ID}`)).toBe(button);
  });

  it('returns null and does not duplicate when already present', () => {
    const masthead = document.createElement('div');
    document.body.appendChild(masthead);
    injectButton(masthead, vi.fn());
    const second = injectButton(masthead, vi.fn());
    expect(second).toBeNull();
    expect(document.querySelectorAll(`#${PANEL_BUTTON_ID}`)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run button`
Expected: FAIL — cannot resolve `./button`.

- [ ] **Step 3: Write the implementation**

Create `entrypoints/youtube/button.ts`:

```ts
export const PANEL_BUTTON_ID = 'wxt-yt-panel-button';

export function createPanelButton(onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = PANEL_BUTTON_ID;
  button.type = 'button';
  button.textContent = 'Panel';
  button.setAttribute('aria-label', 'Toggle panel');
  button.style.cssText =
    'margin:0 8px;padding:0 12px;height:36px;border:none;border-radius:18px;' +
    'background:#272727;color:#fff;cursor:pointer;font-size:14px;';
  button.addEventListener('click', onClick);
  return button;
}

export function injectButton(
  masthead: Element,
  onClick: () => void,
): HTMLButtonElement | null {
  if (document.getElementById(PANEL_BUTTON_ID)) return null;
  const button = createPanelButton(onClick);
  masthead.prepend(button);
  return button;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --run button`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add entrypoints/youtube/button.ts entrypoints/youtube/button.test.ts
git commit -m "feat: add masthead button builder + injection guard"
```

---

### Task 5: Panel React component + scoped CSS

The panel subscribes to `toggleState`, renders only when open, and closes itself via the header close button.

**Files:**
- Create: `entrypoints/youtube/panel.tsx`
- Create: `entrypoints/youtube/panel.css`

**Interfaces:**
- Consumes: `ToggleState` from `./toggleState`.
- Produces: `Panel({ state }: { state: ToggleState }): JSX.Element | null`.

- [ ] **Step 1: Create the scoped CSS**

Create `entrypoints/youtube/panel.css`:

```css
.yt-panel {
  position: fixed;
  top: 64px;
  right: 16px;
  width: 320px;
  max-height: 70vh;
  background: #fff;
  color: #0f0f0f;
  border: 1px solid #ccc;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  z-index: 2147483647;
  font-family: Roboto, Arial, sans-serif;
  overflow: hidden;
}

.yt-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}

.yt-panel__title {
  font-size: 16px;
  font-weight: 600;
}

.yt-panel__close {
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: #606060;
}

.yt-panel__body {
  padding: 16px;
  min-height: 80px;
}
```

- [ ] **Step 2: Create the component**

Create `entrypoints/youtube/panel.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { ToggleState } from './toggleState';
import './panel.css';

export function Panel({ state }: { state: ToggleState }) {
  const [open, setOpen] = useState(state.get());

  useEffect(() => state.subscribe(setOpen), [state]);

  if (!open) return null;

  return (
    <div className="yt-panel" role="dialog" aria-label="Panel">
      <header className="yt-panel__header">
        <span className="yt-panel__title">My Panel</span>
        <button
          className="yt-panel__close"
          onClick={() => state.set(false)}
          aria-label="Close"
        >
          ×
        </button>
      </header>
      <div className="yt-panel__body" />
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm compile`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add entrypoints/youtube/panel.tsx entrypoints/youtube/panel.css
git commit -m "feat: add panel component + scoped css"
```

---

### Task 6: Wire the content script entrypoint

Replace the google.com demo with the YouTube entry: mount the shadow-root panel, wait for the masthead, inject the button wired to `toggle()`.

**Files:**
- Create: `entrypoints/youtube.content.tsx`
- Delete: `entrypoints/content.ts`
- Delete: `entrypoints/youtube/sanity.test.ts` (temporary harness test)

**Interfaces:**
- Consumes: `createToggleState`, `Panel`, `injectButton`, `waitForElement` from the `youtube/` modules.
- Produces: the running content script (no exported API).

- [ ] **Step 1: Create the entrypoint**

Create `entrypoints/youtube.content.tsx`:

```tsx
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
```

- [ ] **Step 2: Delete the old demo content script and temporary test**

```bash
git rm entrypoints/content.ts entrypoints/youtube/sanity.test.ts
```

- [ ] **Step 3: Type-check and run the full test suite**

Run: `pnpm compile && pnpm test --run`
Expected: no type errors; all tests pass (waitForElement, toggleState, button).

- [ ] **Step 4: Manual verification**

Run: `pnpm dev`

Verify in the launched Chrome:
1. Open `youtube.com` → "Panel" button appears in the masthead.
2. Click the button → panel appears top-right. Click again → panel hides.
3. Click the panel's × → panel hides.
4. Navigate to a video, then back to home (SPA nav) → button still present, exactly one button, no console errors.
5. YouTube's styles do not leak into the panel (panel is white-on-dark-page, intact).

- [ ] **Step 5: Commit**

```bash
git add entrypoints/youtube.content.tsx
git commit -m "feat: wire youtube masthead panel content script"
```

---

## Self-Review

- **Spec coverage:** masthead button (Task 4/6), toggle panel in shadow root (Task 5/6), YouTube-only matches (Task 6), SPA double-inject guard (Task 4), masthead wait (Task 2), empty-shell panel with title + close (Task 5), plain scoped CSS (Task 5), remove google demo (Task 6), manual test flow (Task 6) — all covered.
- **Placeholder scan:** none — every code/test step contains full content.
- **Type consistency:** `ToggleState` shape, `createToggleState`, `PANEL_BUTTON_ID`, `injectButton`, `waitForElement`, `Panel` props match across tasks.
