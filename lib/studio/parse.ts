export interface VideoMetrics {
  ctr?: number;
  apv?: number;
}

const CTR_LABEL = /impressions click-?through rate|click-?through rate|thumbnail impressions vtr|\bctr\b/i;

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
