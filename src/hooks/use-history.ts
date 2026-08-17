import { useCallback, useEffect, useMemo, useState } from "react";

import { getDb } from "@/db/client";
import { getEntriesForDateRange, listDomains, listTrackers } from "@/db/repositories";
import { todayLocalDateKey } from "@/lib/dates";
import type { Domain, DomainKey, EntryWithValues, Tracker } from "@/types";

/**
 * Lower bound for the "all-time" entries query. The brief describes History
 * as "a reverse-chronological, day-grouped log of all entries" (not a
 * recent-N-days window), so we fetch everything from a sentinel date far
 * before any real entry could exist through today. `getEntriesForDateRange`
 * does a plain string BETWEEN on `local_date` ("YYYY-MM-DD"), so this is a
 * cheap, always-safe lower bound.
 */
const EARLIEST_LOCAL_DATE = "0001-01-01";

export interface HistoryEntryItem {
  entry: EntryWithValues;
  /** `null` if the entry's tracker was hard-deleted (data layer allows this). */
  tracker: Tracker | null;
  /** `null` alongside `tracker` when the tracker is missing. */
  domain: Domain | null;
}

export interface HistoryDaySection {
  /** "YYYY-MM-DD", device-local. */
  date: string;
  items: HistoryEntryItem[];
}

export type HistoryDomainFilter = DomainKey | "all";

export interface UseHistoryResult {
  /** True only for the initial load (no data yet). */
  loading: boolean;
  /** True during a pull-to-refresh re-fetch (data already present). */
  refreshing: boolean;
  error: Error | null;
  /** The 5 fixed domains, in `sort_order` — for driving the filter row. */
  domains: Domain[];
  domainFilter: HistoryDomainFilter;
  setDomainFilter: (filter: HistoryDomainFilter) => void;
  /** Reverse-chronological (most recent day first); entries within a day are chronological. */
  sections: HistoryDaySection[];
  isEmpty: boolean;
  refresh: () => void;
}

/**
 * Loads every entry ever recorded, joins each to its tracker/domain, and
 * groups by local day (most recent first). Domain filtering is done client
 * side against each entry's *tracker's* `domainId` — never against the
 * tracker's `frequency` — so e.g. a Finance tracker with `frequency:
 * "daily"` still files under the Finance filter, not Daily.
 */
export function useHistory(): UseHistoryResult {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [entries, setEntries] = useState<EntryWithValues[]>([]);
  const [domainFilter, setDomainFilter] = useState<HistoryDomainFilter>("all");
  // Bumped by `refresh()` to re-run the fetch effect on demand. The fetch
  // itself lives inside the effect (async IIFE + `cancelled` flag) rather
  // than in a `useCallback` invoked from the effect body: calling a
  // callback whose *synchronous* prefix (before its first `await`) sets
  // state would run that setState synchronously during the effect, which
  // `react-hooks/set-state-in-effect` correctly flags. Nothing here sets
  // state until after the first `await`.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const db = await getDb();
        const [domainRows, trackerRows, entryRows] = await Promise.all([
          listDomains(db),
          // includeArchived: true — historical entries for a now-archived
          // tracker must still render/group/filter correctly.
          listTrackers(db, { includeArchived: true }),
          getEntriesForDateRange(db, EARLIEST_LOCAL_DATE, todayLocalDateKey()),
        ]);
        if (cancelled) return;
        setDomains(domainRows);
        setTrackers(trackerRows);
        setEntries(entryRows);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setReloadToken((token) => token + 1);
  }, []);

  const trackersById = useMemo(() => {
    const map = new Map<number, Tracker>();
    for (const tracker of trackers) map.set(tracker.id, tracker);
    return map;
  }, [trackers]);

  const domainsById = useMemo(() => {
    const map = new Map<number, Domain>();
    for (const domain of domains) map.set(domain.id, domain);
    return map;
  }, [domains]);

  const sections = useMemo<HistoryDaySection[]>(() => {
    const byDate = new Map<string, HistoryEntryItem[]>();

    for (const entry of entries) {
      const tracker = trackersById.get(entry.trackerId) ?? null;
      const domain = tracker ? (domainsById.get(tracker.domainId) ?? null) : null;

      if (domainFilter !== "all" && domain?.key !== domainFilter) continue;

      const item: HistoryEntryItem = { entry, tracker, domain };
      const list = byDate.get(entry.localDate);
      if (list) list.push(item);
      else byDate.set(entry.localDate, [item]);
    }

    // getEntriesForDateRange returns rows ordered ASC by local_date then
    // occurred_at, so each day's items already arrive in chronological
    // order — only the day-to-day ordering needs reversing here.
    return Array.from(byDate.entries())
      .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
      .map(([date, items]) => ({ date, items }));
  }, [entries, trackersById, domainsById, domainFilter]);

  return {
    loading,
    refreshing,
    error,
    domains,
    domainFilter,
    setDomainFilter,
    sections,
    isEmpty: !loading && sections.length === 0,
    refresh,
  };
}
