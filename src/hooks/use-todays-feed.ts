import { useCallback, useEffect, useState } from "react";
import type { SQLiteDatabase } from "expo-sqlite";

import { getDb } from "@/db/client";
import { getEntriesForDate, listDomains, listTrackers } from "@/db/repositories";
import { ensureSeeded } from "@/db/seed-once";
import { todayLocalDateKey } from "@/lib/dates";
import type { Domain, EntryWithValues, Tracker } from "@/types";

/** One row of the "everything logged today" activity feed. */
export interface FeedEntry {
  entry: EntryWithValues;
  tracker: Tracker | undefined;
  domain: Domain | undefined;
}

export interface UseTodaysFeedResult {
  loading: boolean;
  error: Error | null;
  /** Today's entries across every tracker (any frequency), most recent first. */
  feed: FeedEntry[];
  refresh: () => Promise<void>;
}

/**
 * Pure fetch — no setState calls — so it can be awaited from `refresh()`
 * (fine to setState afterwards there, since that always runs from an event
 * handler, never from inside the mount effect) as well as chained via
 * `.then()` from the mount effect below, without either call site tripping
 * `react-hooks/set-state-in-effect` (which flags an effect that
 * *synchronously* calls a function that itself calls a state setter).
 */
async function fetchTodaysFeed(db: SQLiteDatabase): Promise<FeedEntry[]> {
  await ensureSeeded(db);

  const today = todayLocalDateKey();
  const [entries, trackers, domains] = await Promise.all([
    getEntriesForDate(db, today),
    listTrackers(db, { includeArchived: true }),
    listDomains(db),
  ]);

  const trackersById = new Map(trackers.map((t) => [t.id, t]));
  const domainsById = new Map(domains.map((d) => [d.id, d]));

  const items: FeedEntry[] = entries.map((entry) => {
    const tracker = trackersById.get(entry.trackerId);
    const domain = tracker ? domainsById.get(tracker.domainId) : undefined;
    return { entry, tracker, domain };
  });

  // getEntriesForDate orders ascending by occurred_at; the feed wants
  // most-recent-first.
  items.reverse();
  return items;
}

/**
 * Loads every entry logged today, regardless of tracker frequency, annotated
 * with its tracker and domain for display. `includeArchived: true` on the
 * tracker lookup so an entry logged against a tracker that's since been
 * archived still renders correctly instead of showing "Unknown tracker".
 */
export function useTodaysFeed(): UseTodaysFeedResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const db = await getDb();
      const items = await fetchTodaysFeed(db);
      setFeed(items);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getDb()
      .then(fetchTodaysFeed)
      .then((items) => {
        if (cancelled) return;
        setFeed(items);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, error, feed, refresh };
}
