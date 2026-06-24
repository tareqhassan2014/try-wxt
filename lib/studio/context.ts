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
    target.fetch = async function (this: unknown, ...args: Parameters<typeof fetch>) {
      const [input, init] = args;
      // Capture auth header — non-fatal
      try {
        const auth = readAuth(init);
        if (auth) state.authHeader = auth;
      } catch {
        /* header read is best-effort */
      }
      // Call original exactly once; let rejections propagate unchanged
      const res = await original.apply(this, args as any);
      // Inspect response — non-fatal
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
