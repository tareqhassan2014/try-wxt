export type Ranking = 'above' | 'below' | 'typical';

export function classifyRanking(value: number, baseline: number, tolerance = 0.05): Ranking {
  if (!(baseline > 0)) return 'typical';
  const delta = (value - baseline) / baseline;
  if (delta >= tolerance) return 'above';
  if (delta <= -tolerance) return 'below';
  return 'typical';
}
