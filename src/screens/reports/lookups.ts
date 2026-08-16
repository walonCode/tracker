/**
 * Small shared id-indexing helpers used by every Reports section component.
 * Pure and tiny enough that pulling them out just once here (rather than
 * re-deriving a `Map` in each section) is worth it — several sections need
 * both a tracker-by-id and a domain-by-id lookup to join entries back to
 * their tracker's domain.
 */

import type { Domain, DomainKey, Tracker } from "@/types";

export function indexById<T extends { id: number }>(items: readonly T[]): Map<number, T> {
  const map = new Map<number, T>();
  for (const item of items) map.set(item.id, item);
  return map;
}

/** The domain key of the tracker that logged `entryTrackerId`, or `null` if
 * either the tracker or its domain can't be resolved (e.g. a hard-deleted
 * tracker whose entries still exist historically). */
export function domainKeyForTracker(
  trackerId: number,
  trackersById: Map<number, Tracker>,
  domainsById: Map<number, Domain>
): DomainKey | null {
  const tracker = trackersById.get(trackerId);
  if (!tracker) return null;
  return domainsById.get(tracker.domainId)?.key ?? null;
}
