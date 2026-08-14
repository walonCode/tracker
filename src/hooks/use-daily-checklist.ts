import { useCallback, useEffect, useState } from "react";
import type { SQLiteDatabase } from "expo-sqlite";

import { getDb } from "@/db/client";
import {
  createEntry,
  deleteEntry,
  getEntriesForDate,
  listDomains,
  listTrackerFields,
  listTrackers,
} from "@/db/repositories";
import { todayLocalDateKey } from "@/lib/dates";
import { ensureSeeded } from "@/screens/today/seed-once";
import type { Domain, EntryWithValues, Tracker, TrackerField } from "@/types";

/** One row of the fixed daily checklist: a `frequency: "daily"` tracker plus today's state. */
export interface DailyChecklistItem {
  tracker: Tracker;
  domain: Domain | undefined;
  fields: TrackerField[];
  /** Today's entries for this tracker, most-recent-last (as returned by getEntriesForDate). */
  entries: EntryWithValues[];
  /** True if at least one entry exists for this tracker today. */
  checked: boolean;
  /**
   * Fine-grained completion for trackers with boolean fields (currently only
   * `kind: "prayer"`'s 10 fard/sunnah fields) — how many distinct fields have
   * been logged `true` today, out of the tracker's total field count. `null`
   * for trackers with no boolean fields, where `checked` is the only signal.
   */
  progress: { done: number; total: number } | null;
}

export interface UseDailyChecklistResult {
  loading: boolean;
  error: Error | null;
  items: DailyChecklistItem[];
  /**
   * Toggles a non-prayer tracker's "done today" state: logs a minimal entry
   * (boolean fields set true, other field types left unset — this phase has
   * no data-entry form yet, see task-7) if unchecked, or deletes today's
   * entries for the tracker if checked. No-ops for `kind: "prayer"` — that
   * row routes to `/prayer-log` instead (see `checklist-row.tsx`).
   */
  toggleTracker: (trackerId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

function computeProgress(
  fields: TrackerField[],
  entries: EntryWithValues[]
): { done: number; total: number } | null {
  const booleanFields = fields.filter((f) => f.type === "boolean");
  if (booleanFields.length === 0) return null;

  const doneFieldIds = new Set<number>();
  for (const entry of entries) {
    for (const value of entry.values) {
      if (value.valueBoolean === true) doneFieldIds.add(value.fieldId);
    }
  }
  return { done: doneFieldIds.size, total: booleanFields.length };
}

/**
 * Pure fetch — no setState calls — so it can be awaited from `refresh()`
 * (fine to setState afterwards there, since that only ever runs from an
 * event handler, never from inside the mount effect) as well as chained via
 * `.then()` from the mount effect below, without either call site tripping
 * `react-hooks/set-state-in-effect` (which flags an effect that
 * *synchronously* calls a function that itself calls a state setter).
 */
async function fetchDailyChecklist(db: SQLiteDatabase): Promise<DailyChecklistItem[]> {
  await ensureSeeded(db);

  const today = todayLocalDateKey();
  const [trackers, domains, todaysEntries] = await Promise.all([
    listTrackers(db, {}),
    listDomains(db),
    getEntriesForDate(db, today),
  ]);

  const domainsById = new Map(domains.map((d) => [d.id, d]));
  const entriesByTracker = new Map<number, EntryWithValues[]>();
  for (const entry of todaysEntries) {
    const list = entriesByTracker.get(entry.trackerId) ?? [];
    list.push(entry);
    entriesByTracker.set(entry.trackerId, list);
  }

  const dailyTrackers = trackers
    .filter((t) => t.frequency === "daily")
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  return Promise.all(
    dailyTrackers.map(async (tracker) => {
      const fields = await listTrackerFields(db, tracker.id);
      const entries = entriesByTracker.get(tracker.id) ?? [];
      return {
        tracker,
        domain: domainsById.get(tracker.domainId),
        fields,
        entries,
        checked: entries.length > 0,
        progress: computeProgress(fields, entries),
      };
    })
  );
}

export function useDailyChecklist(): UseDailyChecklistResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [items, setItems] = useState<DailyChecklistItem[]>([]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const db = await getDb();
      const nextItems = await fetchDailyChecklist(db);
      setItems(nextItems);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getDb()
      .then(fetchDailyChecklist)
      .then((nextItems) => {
        if (cancelled) return;
        setItems(nextItems);
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

  const toggleTracker = useCallback(
    async (trackerId: number) => {
      const item = items.find((i) => i.tracker.id === trackerId);
      if (!item || item.tracker.kind === "prayer") return;

      const db = await getDb();
      if (item.checked) {
        await Promise.all(item.entries.map((entry) => deleteEntry(db, entry.id)));
      } else {
        const now = new Date();
        const booleanFields = item.fields.filter((f) => f.type === "boolean");
        await createEntry(db, {
          trackerId,
          occurredAt: now.toISOString(),
          localDate: todayLocalDateKey(),
          values: booleanFields.map((f) => ({ fieldId: f.id, valueBoolean: true })),
        });
      }
      await refresh();
    },
    [items, refresh]
  );

  return { loading, error, items, toggleTracker, refresh };
}
