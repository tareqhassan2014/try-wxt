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
