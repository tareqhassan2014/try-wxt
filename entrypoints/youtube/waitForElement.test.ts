import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitForElement } from './waitForElement';

describe('waitForElement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('resolves immediately when the element already exists', async () => {
    document.body.innerHTML = '<div id="target"></div>';
    const el = await waitForElement('#target');
    expect(el).not.toBeNull();
    expect(el!.id).toBe('target');
  });

  it('resolves once the element is added later', async () => {
    const promise = waitForElement('#late');
    queueMicrotask(() => {
      const div = document.createElement('div');
      div.id = 'late';
      document.body.appendChild(div);
    });
    const el = await promise;
    expect(el!.id).toBe('late');
  });

  it('resolves null after the timeout when the element never appears', async () => {
    vi.useFakeTimers();
    const promise = waitForElement('#never', { timeout: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    const el = await promise;
    expect(el).toBeNull();
    vi.useRealTimers();
  });
});
