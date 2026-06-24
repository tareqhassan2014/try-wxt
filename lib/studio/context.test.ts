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

  it('propagates original fetch rejection and calls it exactly once', async () => {
    const networkError = new TypeError('Failed to fetch');
    const orig = vi.fn(async () => { throw networkError; });
    const target = { fetch: orig as unknown as typeof fetch };
    const cap = createContextCapture(target);
    cap.install();
    await expect(target.fetch('https://studio.youtube.com/x')).rejects.toThrow('Failed to fetch');
    expect(orig).toHaveBeenCalledTimes(1);
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
