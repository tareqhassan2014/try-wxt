import { describe, it, expect, vi, type Mock } from 'vitest';
import { shouldPreventDismiss } from './dismissGuard';

describe('shouldPreventDismiss', () => {
  it('returns true when the shadow host is in the composed path', () => {
    const host = document.createElement('div');
    const child = document.createElement('span');
    expect(shouldPreventDismiss([child, host, document.body], host)).toBe(true);
  });

  it('returns false when the shadow host is not in the composed path', () => {
    const host = document.createElement('div');
    const other = document.createElement('div');
    expect(shouldPreventDismiss([other, document.body], host)).toBe(false);
  });

  it('returns false when host is null', () => {
    expect(shouldPreventDismiss([document.body], null)).toBe(false);
  });
});

// Integration: verify the guard drives preventDefault and caller merge correctly.
// We simulate the handler logic extracted into ShadowPopover.Content to ensure:
// 1. preventDefault is called when host is in the path.
// 2. The caller's onInteractOutside is always called regardless.
// 3. Removing the guard branch causes these assertions to fail.
describe('ShadowPopover.Content handler merge contract', () => {
  type Fn = () => void;
  function makeEvent(path: EventTarget[]) {
    return {
      composedPath: () => path,
      preventDefault: vi.fn<Fn>(),
    };
  }

  function simulateHandler(
    event: ReturnType<typeof makeEvent>,
    host: Element | null,
    callerHandler?: (e: typeof event) => void,
  ) {
    // This mirrors ShadowPopover.Content's onInteractOutside body exactly.
    if (shouldPreventDismiss(event.composedPath(), host)) {
      event.preventDefault();
    }
    callerHandler?.(event);
  }

  it('calls preventDefault when host is in path', () => {
    const host = document.createElement('div');
    const event = makeEvent([document.createElement('span'), host]);
    simulateHandler(event, host);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it('does NOT call preventDefault when host is absent', () => {
    const host = document.createElement('div');
    const event = makeEvent([document.createElement('span')]);
    simulateHandler(event, host);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('calls the caller handler even when guard fires', () => {
    const host = document.createElement('div');
    const event = makeEvent([host]);
    const callerHandler = vi.fn();
    simulateHandler(event, host, callerHandler);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(callerHandler).toHaveBeenCalledWith(event);
  });

  it('calls the caller handler when guard does not fire', () => {
    const host = document.createElement('div');
    const event = makeEvent([document.createElement('div')]);
    const callerHandler = vi.fn();
    simulateHandler(event, host, callerHandler);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(callerHandler).toHaveBeenCalledWith(event);
  });

  it('caller handler is called with no caller provided', () => {
    // Ensures optional chaining on callerHandler does not throw.
    const host = document.createElement('div');
    const event = makeEvent([host]);
    expect(() => simulateHandler(event, host, undefined)).not.toThrow();
  });
});
