// lib/studio/dom.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { findPerformanceCard, findMetricCells, setGuardedText, injectRankingIcon } from './dom';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('findPerformanceCard', () => {
  it('matches the latest + performance card', () => {
    document.body.innerHTML = `
      <ytcd-card>Other card</ytcd-card>
      <ytcd-card><div>Latest content performance</div>
        <span class="metrics-value">3.4%</span>
      </ytcd-card>`;
    const card = findPerformanceCard();
    expect(card?.textContent).toMatch(/latest/i);
    expect(findMetricCells(card!)).toHaveLength(1);
  });
  it('returns null when no card matches', () => {
    document.body.innerHTML = `<ytcd-card>Revenue</ytcd-card>`;
    expect(findPerformanceCard()).toBeNull();
  });
});

describe('setGuardedText', () => {
  it('re-asserts text when something rewrites the cell', async () => {
    const cell = document.createElement('span');
    document.body.appendChild(cell);
    const stop = setGuardedText(cell, '3.46%');
    expect(cell.textContent).toBe('3.46%');
    cell.textContent = '3.4%'; // simulate YouTube rewrite
    await new Promise((r) => setTimeout(r, 0)); // let observer fire
    expect(cell.textContent).toBe('3.46%');
    stop();
  });
});

describe('injectRankingIcon', () => {
  it('appends exactly one icon (idempotent)', () => {
    const cell = document.createElement('span');
    injectRankingIcon(cell, 'above');
    injectRankingIcon(cell, 'below');
    expect(cell.querySelectorAll('.newstudio-ranking-icon')).toHaveLength(1);
    expect(cell.querySelector('.newstudio-ranking-icon')!.innerHTML).toContain('#909090');
  });
});
