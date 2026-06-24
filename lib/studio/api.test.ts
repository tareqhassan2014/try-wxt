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
