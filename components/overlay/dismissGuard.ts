import { isInsideShadowHost } from './composedPath';

/**
 * Returns true if the overlay should stay open — i.e., an interaction crossed
 * our shadow host boundary and must not trigger a dismiss.
 *
 * Extracted so the decision can be unit-tested in isolation from Radix internals.
 */
export function shouldPreventDismiss(
  path: EventTarget[],
  host: Element | null,
): boolean {
  return isInsideShadowHost(path, host);
}
