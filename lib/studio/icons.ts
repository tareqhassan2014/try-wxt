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
