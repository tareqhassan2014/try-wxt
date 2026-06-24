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
