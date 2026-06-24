# shadcn Shared UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install shadcn properly inside the WXT shadow root and build a shared UI layer (one shadow-DOM-aware Radix overlay wrapper + a per-surface theme abstraction), then migrate the YouTube Filter panel onto it.

**Architecture:** shadcn/Tailwind v4 styles are injected per content-script shadow root (`cssInjectionMode: 'ui'`). One `ShadowPopover` wrapper centralizes the Radix shadow-DOM workarounds (PR #2433 `composedPath` dismiss guard + Portal-into-shadow-root). A `ThemeProvider` reads a per-surface resolver and toggles shadcn's `.dark` CSS-var class on the shadow container, live-syncing via `MutationObserver`. The Filter feature becomes a single React tree (trigger + popover) mounted at masthead `#center`.

**Tech Stack:** WXT 0.20, React 19, TypeScript 5.9, Tailwind v4 (`@tailwindcss/vite` + `postcss-rem-to-responsive-pixel`), Radix Popover, class-variance-authority, clsx, tailwind-merge, vitest + happy-dom.

## Global Constraints

- Package manager is **pnpm** (pnpm 10+). Install with `pnpm add`.
- Path alias `@/` → project root (already configured in `.wxt/tsconfig.json`). Use `@/lib`, `@/components`, `@/surfaces`, `@/assets`.
- WXT injects globals — `defineContentScript`, `createShadowRootUi`, `browser` are auto-imported. **Do not** add import statements for them.
- Static checks: `pnpm compile` (`tsc --noEmit`) and `pnpm test` (vitest). No linter exists.
- TDD: write the failing test first, watch it fail, implement minimal, watch it pass, commit. One logical change per commit.
- Tailwind emits `rem`; `postcss.config.mjs` already converts to `px`. Do not remove it.
- New deps (Radix/cva/clsx/tailwind-merge) have **no** postinstall build scripts, so `pnpm-workspace.yaml allowBuilds` needs no change.
- Theme CSS file path (referenced by `components.json` and content scripts): `assets/theme.css`.
- Shadcn config: style `new-york`, base color `neutral`, `cssVariables: true`, Tailwind **v4** (no `tailwind.config` file).
- Branch: `feat/shadcn-shared-ui` (already created; the design spec is committed there).

---

### Task 1: Foundation — deps, `cn` util, `components.json`

**Files:**
- Modify: `package.json` (via `pnpm add`)
- Create: `lib/utils.ts`
- Create: `lib/utils.test.ts`
- Create: `components.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `cn(...inputs: ClassValue[]): string` from `@/lib/utils`.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add @radix-ui/react-popover @radix-ui/react-slot class-variance-authority clsx tailwind-merge
```

- [ ] **Step 2: Write the failing test**

Create `lib/utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });

  it('merges conflicting tailwind classes, last wins', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- --run lib/utils.test.ts`
Expected: FAIL — `Failed to resolve import "./utils"` / `cn is not defined`.

- [ ] **Step 4: Write minimal implementation**

Create `lib/utils.ts`:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- --run lib/utils.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Create `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "assets/theme.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 7: Type-check and commit**

Run: `pnpm compile`
Expected: no errors.

```bash
git add package.json pnpm-lock.yaml lib/utils.ts lib/utils.test.ts components.json
git commit -m "feat: add shadcn foundation deps, cn util, components.json"
```

---

### Task 2: Theme CSS (shadcn variables, Tailwind v4)

**Files:**
- Create: `assets/theme.css`

**Interfaces:**
- Consumes: nothing.
- Produces: `@/assets/theme.css` — importing it into a content script injects Tailwind + shadcn CSS variables (`:root` light, `.dark` dark) into that shadow root. The `.dark` class on any ancestor switches the theme.

CSS is verified by build, not unit test (no behavior to assert in vitest).

- [ ] **Step 1: Create `assets/theme.css`**

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    border-color: var(--color-border);
  }
}
```

- [ ] **Step 2: Verify it builds**

Run: `pnpm build`
Expected: build succeeds, no PostCSS/Tailwind errors. (CSS is injected at content-script load; nothing to assert beyond a clean build.)

- [ ] **Step 3: Commit**

```bash
git add assets/theme.css
git commit -m "feat: add shadcn theme CSS (Tailwind v4 vars) for shadow root"
```

---

### Task 3: Button primitive

**Files:**
- Create: `components/ui/button.tsx`
- Create: `components/ui/button.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`; `@radix-ui/react-slot`; `class-variance-authority`.
- Produces: `Button` React component and `buttonVariants(opts?)` from `@/components/ui/button`. Props: standard `button` props + `variant?: 'default' | 'ghost' | 'outline' | 'secondary'`, `size?: 'default' | 'sm' | 'icon'`, `asChild?: boolean`.

- [ ] **Step 1: Write the failing test**

Create `components/ui/button.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Button } from './button';

afterEach(cleanup);

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Filter</Button>);
    expect(screen.getByRole('button', { name: 'Filter' })).toBeTruthy();
  });

  it('applies the ghost variant class', () => {
    render(<Button variant="ghost">Filter</Button>);
    const btn = screen.getByRole('button', { name: 'Filter' });
    expect(btn.className).toContain('hover:bg-accent');
  });

  it('renders as a child element when asChild is set', () => {
    render(
      <Button asChild>
        <a href="/x">link</a>
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'link' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Install the test renderer (dev dep, first component test)**

```bash
pnpm add -D @testing-library/react @testing-library/dom
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- --run components/ui/button.test.tsx`
Expected: FAIL — `Failed to resolve import "./button"`.

- [ ] **Step 4: Write minimal implementation**

Create `components/ui/button.tsx`:

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- --run components/ui/button.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Type-check and commit**

Run: `pnpm compile`
Expected: no errors.

```bash
git add package.json pnpm-lock.yaml components/ui/button.tsx components/ui/button.test.tsx
git commit -m "feat: add shadcn Button primitive"
```

---

### Task 4: composedPath dismiss guard

**Files:**
- Create: `components/overlay/composedPath.ts`
- Create: `components/overlay/composedPath.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `isInsideShadowHost(path: EventTarget[], host: Element | null): boolean` from `@/components/overlay/composedPath`. Returns `true` when the event's composed path crosses `host` (i.e. the interaction originated inside our shadow tree and must NOT dismiss the overlay).

- [ ] **Step 1: Write the failing test**

Create `components/overlay/composedPath.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isInsideShadowHost } from './composedPath';

describe('isInsideShadowHost', () => {
  it('returns true when the host is in the path', () => {
    const host = document.createElement('div');
    const child = document.createElement('span');
    expect(isInsideShadowHost([child, host, document.body], host)).toBe(true);
  });

  it('returns false when the host is not in the path', () => {
    const host = document.createElement('div');
    const other = document.createElement('div');
    expect(isInsideShadowHost([other, document.body], host)).toBe(false);
  });

  it('returns false when host is null', () => {
    expect(isInsideShadowHost([document.body], null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run components/overlay/composedPath.test.ts`
Expected: FAIL — `Failed to resolve import "./composedPath"`.

- [ ] **Step 3: Write minimal implementation**

Create `components/overlay/composedPath.ts`:

```ts
/**
 * Radix DismissableLayer (unmerged upstream PR #2433) treats an interaction
 * that crosses the shadow host as "outside", which closes-then-reopens the
 * overlay on a trigger click. We guard against that by inspecting the event's
 * composed path: if our shadow host is in it, the interaction is really inside
 * our UI and must not dismiss.
 */
export function isInsideShadowHost(
  path: EventTarget[],
  host: Element | null,
): boolean {
  if (!host) return false;
  return path.includes(host);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run components/overlay/composedPath.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/overlay/composedPath.ts components/overlay/composedPath.test.ts
git commit -m "feat: add composedPath shadow-host dismiss guard"
```

---

### Task 5: ShadowPopover wrapper + ShadowRoot context

**Files:**
- Create: `components/overlay/ShadowRootContext.tsx`
- Create: `components/overlay/ShadowPopover.tsx`
- Create: `components/overlay/ShadowRootContext.test.tsx`

**Interfaces:**
- Consumes: `isInsideShadowHost` from `@/components/overlay/composedPath`; `@radix-ui/react-popover`; `cn` from `@/lib/utils`.
- Produces:
  - `ShadowRootProvider({ container, host, children })` and `useShadowRoot(): { container: HTMLElement | null; host: HTMLElement | null }` from `@/components/overlay/ShadowRootContext`.
  - `ShadowPopover` compound component from `@/components/overlay/ShadowPopover` with `.Root`, `.Trigger` (forwards to Radix `Popover.Trigger`, supports `asChild`), and `.Content` (props: standard Radix `Popover.Content` props + `className`). `.Content` portals into the shadow `container` and applies the composed-path dismiss guard using `host`.

- [ ] **Step 1: Write the failing test (context behavior)**

Create `components/overlay/ShadowRootContext.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ShadowRootProvider, useShadowRoot } from './ShadowRootContext';

afterEach(cleanup);

function Probe({ onValue }: { onValue: (v: ReturnType<typeof useShadowRoot>) => void }) {
  onValue(useShadowRoot());
  return null;
}

describe('ShadowRootContext', () => {
  it('provides the container and host', () => {
    const container = document.createElement('div');
    const host = document.createElement('div');
    let captured: ReturnType<typeof useShadowRoot> | null = null;
    render(
      <ShadowRootProvider container={container} host={host}>
        <Probe onValue={(v) => (captured = v)} />
      </ShadowRootProvider>,
    );
    expect(captured).toEqual({ container, host });
  });

  it('defaults to nulls with no provider', () => {
    let captured: ReturnType<typeof useShadowRoot> | null = null;
    render(<Probe onValue={(v) => (captured = v)} />);
    expect(captured).toEqual({ container: null, host: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run components/overlay/ShadowRootContext.test.tsx`
Expected: FAIL — `Failed to resolve import "./ShadowRootContext"`.

- [ ] **Step 3: Implement the context**

Create `components/overlay/ShadowRootContext.tsx`:

```tsx
import * as React from 'react';

interface ShadowRootValue {
  container: HTMLElement | null;
  host: HTMLElement | null;
}

const ShadowRootContext = React.createContext<ShadowRootValue>({
  container: null,
  host: null,
});

export function ShadowRootProvider({
  container,
  host,
  children,
}: {
  container: HTMLElement;
  host: HTMLElement;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ container, host }), [container, host]);
  return (
    <ShadowRootContext.Provider value={value}>
      {children}
    </ShadowRootContext.Provider>
  );
}

export function useShadowRoot(): ShadowRootValue {
  return React.useContext(ShadowRootContext);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run components/overlay/ShadowRootContext.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement ShadowPopover**

Create `components/overlay/ShadowPopover.tsx`:

```tsx
import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { useShadowRoot } from './ShadowRootContext';
import { isInsideShadowHost } from './composedPath';

const Root = PopoverPrimitive.Root;
const Trigger = PopoverPrimitive.Trigger;
const Anchor = PopoverPrimitive.Anchor;

const Content = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'start', sideOffset = 8, ...props }, ref) => {
  const { container, host } = useShadowRoot();
  return (
    <PopoverPrimitive.Portal container={container ?? undefined}>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        onInteractOutside={(event) => {
          // Centralized PR #2433 workaround: an interaction crossing our shadow
          // host is really inside the UI — keep the overlay open.
          if (isInsideShadowHost(event.composedPath(), host)) {
            event.preventDefault();
          }
        }}
        className={cn(
          'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
Content.displayName = 'ShadowPopoverContent';

export const ShadowPopover = Object.assign(Root, {
  Root,
  Trigger,
  Anchor,
  Content,
});
```

- [ ] **Step 6: Type-check**

Run: `pnpm compile`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/overlay/ShadowRootContext.tsx components/overlay/ShadowRootContext.test.tsx components/overlay/ShadowPopover.tsx
git commit -m "feat: add ShadowPopover wrapper + shadow-root context"
```

---

### Task 6: Per-surface theme resolvers

**Files:**
- Create: `lib/theme/resolvers.ts`
- Create: `surfaces/youtube/theme.ts`
- Create: `surfaces/youtube/theme.test.ts`
- Create: `surfaces/studio/theme.ts`
- Create: `surfaces/studio/theme.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - From `@/lib/theme/resolvers`: `type Theme = 'dark' | 'light'`; `interface SurfaceTheme { read(): Theme; observe(onChange: () => void): () => void }`.
  - From `@/surfaces/youtube/theme`: `const youtubeTheme: SurfaceTheme`.
  - From `@/surfaces/studio/theme`: `const studioTheme: SurfaceTheme`.

- [ ] **Step 1: Create the resolver type**

Create `lib/theme/resolvers.ts`:

```ts
export type Theme = 'dark' | 'light';

/**
 * A per-surface theme source. `read()` returns the current theme; `observe()`
 * starts watching the surface's signal and returns a cleanup function.
 */
export interface SurfaceTheme {
  read(): Theme;
  observe(onChange: () => void): () => void;
}
```

- [ ] **Step 2: Write the failing test (youtube)**

Create `surfaces/youtube/theme.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { youtubeTheme } from './theme';

afterEach(() => document.documentElement.removeAttribute('dark'));

describe('youtubeTheme.read', () => {
  it('returns dark when <html> has the dark attribute', () => {
    document.documentElement.setAttribute('dark', '');
    expect(youtubeTheme.read()).toBe('dark');
  });

  it('returns light when <html> has no dark attribute', () => {
    expect(youtubeTheme.read()).toBe('light');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- --run surfaces/youtube/theme.test.ts`
Expected: FAIL — `Failed to resolve import "./theme"`.

- [ ] **Step 4: Implement the youtube resolver**

Create `surfaces/youtube/theme.ts`:

```ts
import type { SurfaceTheme } from '@/lib/theme/resolvers';

/**
 * Public YouTube signals dark mode with a `dark` attribute on <html>.
 */
export const youtubeTheme: SurfaceTheme = {
  read() {
    return document.documentElement.hasAttribute('dark') ? 'dark' : 'light';
  },
  observe(onChange) {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dark'],
    });
    return () => observer.disconnect();
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- --run surfaces/youtube/theme.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Write the failing test (studio)**

Create `surfaces/studio/theme.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { studioTheme } from './theme';

afterEach(() => document.documentElement.removeAttribute('dark'));

describe('studioTheme.read', () => {
  // NOTE: Studio's real dark-mode signal is UNCONFIRMED (spec open item).
  // Current best guess mirrors public YouTube: a `dark` attribute on <html>.
  // Verify live in a Studio session and update this resolver + test together.
  it('returns dark when the dark signal is present', () => {
    document.documentElement.setAttribute('dark', '');
    expect(studioTheme.read()).toBe('dark');
  });

  it('returns light when the dark signal is absent', () => {
    expect(studioTheme.read()).toBe('light');
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm test -- --run surfaces/studio/theme.test.ts`
Expected: FAIL — `Failed to resolve import "./theme"`.

- [ ] **Step 8: Implement the studio resolver**

Create `surfaces/studio/theme.ts`:

```ts
import type { SurfaceTheme } from '@/lib/theme/resolvers';

/**
 * TBD — Studio's dark-mode signal is unconfirmed (spec open item). Best guess:
 * mirror public YouTube (`dark` attribute on <html>). MUST be verified in a
 * live Studio session; update read()/observe() and the test together when the
 * real signal is known (likely a CSS-variable probe such as
 * `--yt-spec-base-background`).
 */
export const studioTheme: SurfaceTheme = {
  read() {
    return document.documentElement.hasAttribute('dark') ? 'dark' : 'light';
  },
  observe(onChange) {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dark'],
    });
    return () => observer.disconnect();
  },
};
```

- [ ] **Step 9: Run test to verify it passes**

Run: `pnpm test -- --run surfaces/studio/theme.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 10: Commit**

```bash
git add lib/theme/resolvers.ts surfaces/youtube/theme.ts surfaces/youtube/theme.test.ts surfaces/studio/theme.ts surfaces/studio/theme.test.ts
git commit -m "feat: add per-surface theme resolvers (youtube + studio stub)"
```

---

### Task 7: ThemeProvider

**Files:**
- Create: `lib/theme/ThemeProvider.tsx`
- Create: `lib/theme/ThemeProvider.test.tsx`

**Interfaces:**
- Consumes: `SurfaceTheme` from `@/lib/theme/resolvers`.
- Produces: `ThemeProvider({ surface, target, children }: { surface: SurfaceTheme; target: HTMLElement; children: React.ReactNode })` from `@/lib/theme/ThemeProvider`. On mount and on every `surface` change it toggles the `dark` class on `target`; it cleans up the observer on unmount.

- [ ] **Step 1: Write the failing test**

Create `lib/theme/ThemeProvider.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import type { SurfaceTheme, Theme } from './resolvers';
import { ThemeProvider } from './ThemeProvider';

afterEach(cleanup);

function makeSurface(initial: Theme) {
  let current = initial;
  let listener: (() => void) | null = null;
  let disconnected = false;
  return {
    surface: {
      read: () => current,
      observe(onChange: () => void) {
        listener = onChange;
        return () => {
          disconnected = true;
        };
      },
    } as SurfaceTheme,
    set(next: Theme) {
      current = next;
      listener?.();
    },
    wasDisconnected: () => disconnected,
  };
}

describe('ThemeProvider', () => {
  it('adds the dark class when the surface reads dark', () => {
    const target = document.createElement('div');
    const { surface } = makeSurface('dark');
    render(<ThemeProvider surface={surface} target={target} />);
    expect(target.classList.contains('dark')).toBe(true);
  });

  it('does not add the dark class when the surface reads light', () => {
    const target = document.createElement('div');
    const { surface } = makeSurface('light');
    render(<ThemeProvider surface={surface} target={target} />);
    expect(target.classList.contains('dark')).toBe(false);
  });

  it('live-updates the class when the surface changes', () => {
    const target = document.createElement('div');
    const ctl = makeSurface('light');
    render(<ThemeProvider surface={ctl.surface} target={target} />);
    expect(target.classList.contains('dark')).toBe(false);
    act(() => ctl.set('dark'));
    expect(target.classList.contains('dark')).toBe(true);
  });

  it('disconnects the observer on unmount', () => {
    const target = document.createElement('div');
    const ctl = makeSurface('dark');
    const { unmount } = render(<ThemeProvider surface={ctl.surface} target={target} />);
    unmount();
    expect(ctl.wasDisconnected()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run lib/theme/ThemeProvider.test.tsx`
Expected: FAIL — `Failed to resolve import "./ThemeProvider"`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/theme/ThemeProvider.tsx`:

```tsx
import * as React from 'react';
import type { SurfaceTheme } from './resolvers';

export function ThemeProvider({
  surface,
  target,
  children,
}: {
  surface: SurfaceTheme;
  target: HTMLElement;
  children?: React.ReactNode;
}) {
  React.useEffect(() => {
    const apply = () => {
      target.classList.toggle('dark', surface.read() === 'dark');
    };
    apply();
    return surface.observe(apply);
  }, [surface, target]);

  return <>{children}</>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run lib/theme/ThemeProvider.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Type-check and commit**

Run: `pnpm compile`
Expected: no errors.

```bash
git add lib/theme/ThemeProvider.tsx lib/theme/ThemeProvider.test.tsx
git commit -m "feat: add ThemeProvider that toggles shadcn dark class on shadow container"
```

---

### Task 8: Surface registries

**Files:**
- Create: `surfaces/registry.ts`
- Create: `surfaces/youtube/registry.ts`
- Create: `surfaces/youtube/registry.test.ts`
- Create: `surfaces/studio/registry.ts`

**Interfaces:**
- Consumes: `SurfaceTheme` from `@/lib/theme/resolvers`; `youtubeTheme`, `studioTheme`.
- Produces:
  - From `@/surfaces/registry`: `interface SurfaceRegistry { name: string; matches: string[]; anchorSelector: string; append: 'first' | 'last'; theme: SurfaceTheme }`.
  - From `@/surfaces/youtube/registry`: `const youtubeRegistry: SurfaceRegistry`.
  - From `@/surfaces/studio/registry`: `const studioRegistry: SurfaceRegistry` (typed stub).

- [ ] **Step 1: Create the registry type**

Create `surfaces/registry.ts`:

```ts
import type { SurfaceTheme } from '@/lib/theme/resolvers';

/**
 * Describes how a feature attaches to one host surface: where it mounts, which
 * URLs it runs on, and how it reads the theme. One registry entry per surface.
 */
export interface SurfaceRegistry {
  name: string;
  matches: string[];
  /** Selector for the element the UI is anchored to, within the host page. */
  anchorSelector: string;
  /** Where to place the shadow host relative to the anchor's children. */
  append: 'first' | 'last';
  theme: SurfaceTheme;
}
```

- [ ] **Step 2: Write the failing test**

Create `surfaces/youtube/registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { youtubeRegistry } from './registry';
import { youtubeTheme } from './theme';

describe('youtubeRegistry', () => {
  it('matches youtube.com URLs', () => {
    expect(youtubeRegistry.matches).toContain('*://*.youtube.com/*');
  });

  it('anchors at the masthead #center, placed first', () => {
    expect(youtubeRegistry.anchorSelector).toBe('#center');
    expect(youtubeRegistry.append).toBe('first');
  });

  it('uses the youtube theme resolver', () => {
    expect(youtubeRegistry.theme).toBe(youtubeTheme);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- --run surfaces/youtube/registry.test.ts`
Expected: FAIL — `Failed to resolve import "./registry"`.

- [ ] **Step 4: Implement the youtube registry**

Create `surfaces/youtube/registry.ts`:

```ts
import type { SurfaceRegistry } from '@/surfaces/registry';
import { youtubeTheme } from './theme';

export const youtubeRegistry: SurfaceRegistry = {
  name: 'youtube',
  matches: ['*://*.youtube.com/*'],
  // #center holds the search box; placing our host first puts the Filter
  // button just left of the search box, in the gap after the logo.
  anchorSelector: '#center',
  append: 'first',
  theme: youtubeTheme,
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- --run surfaces/youtube/registry.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Implement the studio registry stub**

Create `surfaces/studio/registry.ts`:

```ts
import type { SurfaceRegistry } from '@/surfaces/registry';
import { studioTheme } from './theme';

/**
 * STUB — no Studio feature ships yet. `anchorSelector` is a placeholder and
 * MUST be confirmed in a live Studio session before any feature mounts here.
 */
export const studioRegistry: SurfaceRegistry = {
  name: 'studio',
  matches: ['*://studio.youtube.com/*'],
  anchorSelector: 'ytcp-header',
  append: 'last',
  theme: studioTheme,
};
```

- [ ] **Step 7: Type-check and commit**

Run: `pnpm compile`
Expected: no errors.

```bash
git add surfaces/registry.ts surfaces/youtube/registry.ts surfaces/youtube/registry.test.ts surfaces/studio/registry.ts
git commit -m "feat: add surface registries (youtube + studio stub)"
```

---

### Task 9: FilterFeature (panel rebuilt on the shared layer)

**Files:**
- Create: `surfaces/youtube/FilterFeature.tsx`
- Create: `surfaces/youtube/FilterFeature.test.tsx`

**Interfaces:**
- Consumes: `ShadowPopover` from `@/components/overlay/ShadowPopover`; `Button` from `@/components/ui/button`. Must be rendered inside a `ShadowRootProvider` (provides the portal container + dismiss host).
- Produces: `FilterFeature()` from `@/surfaces/youtube/FilterFeature` — the trigger Button + popover panel as one React tree.

- [ ] **Step 1: Write the failing test**

Create `surfaces/youtube/FilterFeature.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ShadowRootProvider } from '@/components/overlay/ShadowRootContext';
import { FilterFeature } from './FilterFeature';

afterEach(cleanup);

function renderInShadow() {
  const container = document.createElement('div');
  const host = document.createElement('div');
  document.body.append(container, host);
  return render(
    <ShadowRootProvider container={container} host={host}>
      <FilterFeature />
    </ShadowRootProvider>,
  );
}

describe('FilterFeature', () => {
  it('renders the Filter trigger button', () => {
    renderInShadow();
    expect(screen.getByRole('button', { name: /filter/i })).toBeTruthy();
  });

  it('keeps the panel closed until the trigger is activated', () => {
    renderInShadow();
    // Radix renders content only when open; closed by default.
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run surfaces/youtube/FilterFeature.test.tsx`
Expected: FAIL — `Failed to resolve import "./FilterFeature"`.

- [ ] **Step 3: Write minimal implementation**

Create `surfaces/youtube/FilterFeature.tsx`:

```tsx
import { ShadowPopover } from '@/components/overlay/ShadowPopover';
import { Button } from '@/components/ui/button';

export function FilterFeature() {
  return (
    <ShadowPopover.Root>
      <ShadowPopover.Trigger asChild>
        <Button variant="ghost" size="sm" aria-label="Filter">
          Filter
        </Button>
      </ShadowPopover.Trigger>
      <ShadowPopover.Content
        role="dialog"
        aria-label="Filter panel"
        align="start"
        sideOffset={8}
      >
        <header className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">My Panel</span>
        </header>
        <div className="min-h-24" />
      </ShadowPopover.Content>
    </ShadowPopover.Root>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run surfaces/youtube/FilterFeature.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Type-check and commit**

Run: `pnpm compile`
Expected: no errors.

```bash
git add surfaces/youtube/FilterFeature.tsx surfaces/youtube/FilterFeature.test.tsx
git commit -m "feat: rebuild Filter panel as FilterFeature on the shared UI layer"
```

---

### Task 10: Content script rewrite + remove legacy files

**Files:**
- Rewrite: `entrypoints/youtube.content.tsx`
- Keep: `entrypoints/youtube/waitForElement.ts` (+ its test)
- Delete: `entrypoints/youtube/panel.tsx`, `entrypoints/youtube/panel.css`,
  `entrypoints/youtube/panelPosition.ts` (+ test),
  `entrypoints/youtube/outsideClick.ts` (+ test),
  `entrypoints/youtube/panelTheme.ts` (+ test),
  `entrypoints/youtube/toggleState.ts` (+ test),
  `entrypoints/youtube/button.ts` (+ test)

**Interfaces:**
- Consumes: `youtubeRegistry` from `@/surfaces/youtube/registry`; `ShadowRootProvider`; `ThemeProvider`; `FilterFeature`; `waitForElement`; `@/assets/theme.css`; WXT globals `defineContentScript`, `createShadowRootUi`.
- Produces: the content-script entrypoint (default export). No exports consumed elsewhere.

- [ ] **Step 1: Rewrite the content script**

Replace the entire contents of `entrypoints/youtube.content.tsx`:

```tsx
import ReactDOM from 'react-dom/client';
import '@/assets/theme.css';
import { youtubeRegistry } from '@/surfaces/youtube/registry';
import { ShadowRootProvider } from '@/components/overlay/ShadowRootContext';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { FilterFeature } from '@/surfaces/youtube/FilterFeature';
import { waitForElement } from './youtube/waitForElement';

export default defineContentScript({
  matches: youtubeRegistry.matches,
  cssInjectionMode: 'ui',
  async main(ctx) {
    let ui: Awaited<ReturnType<typeof createShadowRootUi>> | undefined;

    async function mount() {
      // Re-mount is idempotent: if our host is still attached, do nothing.
      if (ui?.shadowHost?.isConnected) return;

      const masthead = await waitForElement('ytd-masthead', { timeout: 15000 });
      const anchor = masthead?.querySelector(youtubeRegistry.anchorSelector);
      if (!anchor) {
        console.warn('[yt-filter] masthead anchor not found');
        return;
      }

      ui = await createShadowRootUi(ctx, {
        name: 'yt-filter-ui',
        position: 'inline',
        anchor,
        append: youtubeRegistry.append,
        onMount(uiContainer, _shadow, shadowHost) {
          const root = ReactDOM.createRoot(uiContainer);
          root.render(
            <ShadowRootProvider container={uiContainer} host={shadowHost}>
              <ThemeProvider surface={youtubeRegistry.theme} target={uiContainer}>
                <FilterFeature />
              </ThemeProvider>
            </ShadowRootProvider>,
          );
          return root;
        },
        onRemove(root) {
          root?.unmount();
        },
      });
      ui.mount();
    }

    await mount();

    // YouTube is a SPA; if the masthead is replaced on navigation, re-mount.
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      mount();
    });
  },
});
```

- [ ] **Step 2: Delete the legacy files**

```bash
git rm entrypoints/youtube/panel.tsx entrypoints/youtube/panel.css \
  entrypoints/youtube/panelPosition.ts entrypoints/youtube/panelPosition.test.ts \
  entrypoints/youtube/outsideClick.ts entrypoints/youtube/outsideClick.test.ts \
  entrypoints/youtube/panelTheme.ts entrypoints/youtube/panelTheme.test.ts \
  entrypoints/youtube/toggleState.ts entrypoints/youtube/toggleState.test.ts \
  entrypoints/youtube/button.ts entrypoints/youtube/button.test.ts
```

- [ ] **Step 3: Type-check, full test run, and build**

Run: `pnpm compile`
Expected: no errors (no dangling imports to deleted files).

Run: `pnpm test -- --run`
Expected: PASS — all suites (utils, button, composedPath, ShadowRootContext, youtube/theme, studio/theme, ThemeProvider, youtube/registry, FilterFeature, waitForElement). No references to deleted modules.

Run: `pnpm build`
Expected: build succeeds; `.output/` produced.

- [ ] **Step 4: Commit**

```bash
git add entrypoints/youtube.content.tsx
git commit -m "feat: wire Filter feature through shared UI layer; remove legacy panel code"
```

---

## Manual Verification (after Task 10)

Not automated (Radix portals + real YouTube DOM need a browser):

1. `pnpm dev`, open `https://www.youtube.com`.
2. Filter button appears in the masthead, just left of the search box.
3. Click it → panel opens anchored under the button, themed to match YouTube.
4. Toggle YouTube dark/light (Account menu → Appearance) → panel theme live-syncs.
5. Click outside → panel closes. Click the trigger → it opens (does NOT close-then-reopen — confirms the composedPath guard).
6. Navigate via a YouTube link (SPA nav) → button persists / re-mounts.
7. **Studio TBD:** Studio resolver is an unverified guess; do not rely on Studio theming until confirmed live.

---

## Self-Review Notes

- **Spec coverage:** foundation install (T1–T2), ShadowPopover wrapper w/ PR#2433 guard + portal (T4–T5), per-surface theme abstraction (T6–T7), surface registry incl. Studio stub (T8), Filter panel migration + legacy deletion (T9–T10), TDD throughout, manual live-verify checklist. All spec sections mapped.
- **Type consistency:** `SurfaceTheme.read()/observe()` used identically in T6/T7/T8; `ShadowRootProvider` props `{container, host}` consistent T5/T9/T10; `useShadowRoot()` return shape `{container, host}` matches consumer in ShadowPopover. `youtubeRegistry.theme/anchorSelector/append/matches` consumed consistently in T10.
- **Open items (carried from spec, intentionally not resolved here):** Studio theme signal + Studio anchor selector are typed stubs flagged TBD for live verification; PR#2433 dependency contained to `composedPath.ts` + `ShadowPopover.tsx`.
