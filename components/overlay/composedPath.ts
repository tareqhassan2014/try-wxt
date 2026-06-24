/**
 * Radix DismissableLayer (unmerged upstream PR #2433) treats an interaction
 * that crosses the shadow host as "outside", which closes-then-reopens the
 * overlay on a trigger click. We guard against that by inspecting the event's
 * composed path: if our shadow host is in it, the interaction is really inside
 * our UI and must not dismiss.
 */
export function isInsideShadowHost(
  path: EventTarget[],
  host: Element | null,
): boolean {
  if (!host) return false;
  return path.includes(host);
}
