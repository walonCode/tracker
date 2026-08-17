import { useCallback, useEffect, useState } from "react";
import type { SQLiteDatabase } from "expo-sqlite";

import { getDb } from "@/db/client";
import { getEntriesForDateRange, listTrackerFields, listTrackers } from "@/db/repositories";
import { ensureSeeded } from "@/db/seed-once";
import {
  computeAggregateDailyIntensity,
  type AggregateDaySource,
  type DayIntensity,
} from "@/lib/contribution-graph";
import { addLocalDays, toLocalDateKey } from "@/lib/dates";

/** 2 weeks, matching the `ContributionGraph`'s `weeks={PREVIEW_WEEKS}` prop below. */
const PREVIEW_WEEKS = 2;
const PREVIEW_DAYS = PREVIEW_WEEKS * 7;

export interface UseContributionPreviewResult {
  loading: boolean;
  error: Error | null;
  data: DayIntensity[];
  weeks: number;
  refresh: () => Promise<void>;
}

/**
 * Pure fetch — no setState calls — so it can be awaited from `refresh()`
 * (fine to setState afterwards there, since that only ever runs from an
 * event handler, never from inside the mount effect) as well as chained via
 * `.then()` from the mount effect below, without either call site tripping
 * `react-hooks/set-state-in-effect` (which flags an effect that
 * *synchronously* calls a function that itself calls a state setter).
 *
 * Builds one `AggregateDaySource` per (daily tracker, day) pair over the
 * last `PREVIEW_DAYS` days, `value` = 1 if that tracker has an entry that
 * day, 0 otherwise (the brief's "simplest" option — no per-tracker
 * weighting). `computeAggregateDailyIntensity`'s default "average" combine
 * then turns that into "what fraction of today's checklist got done" per
 * day, which is exactly what a Today-screen preview should show.
 */
async function fetchContributionPreview(db: SQLiteDatabase): Promise<DayIntensity[]> {
  await ensureSeeded(db);

  const today = new Date();
  const rangeStart = addLocalDays(today, -(PREVIEW_DAYS - 1));
  const startDate = toLocalDateKey(rangeStart);
  const endDate = toLocalDateKey(today);

  const [trackers, entries] = await Promise.all([
    listTrackers(db, {}),
    getEntriesForDateRange(db, startDate, endDate),
  ]);

  const dailyTrackers = trackers.filter((t) => t.frequency === "daily");
  const dailyTrackerIds = new Set(dailyTrackers.map((t) => t.id));
  const prayerTracker = dailyTrackers.find((t) => t.kind === "prayer") ?? null;
  const prayerFields = prayerTracker ? await listTrackerFields(db, prayerTracker.id) : [];
  const fardFieldIds = new Set(
    prayerFields.filter((f) => f.name.endsWith("_fard")).map((f) => f.id)
  );
  const sunnahFieldIds = new Set(
    prayerFields.filter((f) => f.name.endsWith("_sunnah")).map((f) => f.id)
  );
  const fardTotal = fardFieldIds.size || 1;

  const loggedByDate = new Map<string, Set<number>>();
  // Prayer tracker only: per-day fard-completed count and any-sunnah-true flag,
  // mirroring `computePrayerProgress` in `use-daily-checklist.ts` so the
  // preview's brightness matches the checklist's own fard-driven definition.
  const prayerByDate = new Map<string, { fardDone: Set<number>; sunnahDone: boolean }>();

  for (const entry of entries) {
    if (!dailyTrackerIds.has(entry.trackerId)) continue;

    let loggedTrackerIds = loggedByDate.get(entry.localDate);
    if (!loggedTrackerIds) {
      loggedTrackerIds = new Set();
      loggedByDate.set(entry.localDate, loggedTrackerIds);
    }
    loggedTrackerIds.add(entry.trackerId);

    if (prayerTracker && entry.trackerId === prayerTracker.id) {
      let prayerDay = prayerByDate.get(entry.localDate);
      if (!prayerDay) {
        prayerDay = { fardDone: new Set(), sunnahDone: false };
        prayerByDate.set(entry.localDate, prayerDay);
      }
      for (const value of entry.values) {
        if (value.valueBoolean !== true) continue;
        if (fardFieldIds.has(value.fieldId)) prayerDay.fardDone.add(value.fieldId);
        if (sunnahFieldIds.has(value.fieldId)) prayerDay.sunnahDone = true;
      }
    }
  }

  const sources: AggregateDaySource[] = [];
  let cursor = rangeStart;
  for (let i = 0; i < PREVIEW_DAYS; i++) {
    const dateKey = toLocalDateKey(cursor);
    const loggedTrackerIds = loggedByDate.get(dateKey);
    for (const trackerId of dailyTrackerIds) {
      if (prayerTracker && trackerId === prayerTracker.id) {
        const prayerDay = prayerByDate.get(dateKey);
        sources.push({
          date: dateKey,
          value: prayerDay ? prayerDay.fardDone.size / fardTotal : 0,
          secondary: prayerDay?.sunnahDone ?? false,
        });
        continue;
      }
      sources.push({
        date: dateKey,
        value: loggedTrackerIds?.has(trackerId) ? 1 : 0,
      });
    }
    cursor = addLocalDays(cursor, 1);
  }

  return computeAggregateDailyIntensity(sources);
}

export function useContributionPreview(): UseContributionPreviewResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<DayIntensity[]>([]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const db = await getDb();
      const nextData = await fetchContributionPreview(db);
      setData(nextData);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getDb()
      .then(fetchContributionPreview)
      .then((nextData) => {
        if (cancelled) return;
        setData(nextData);
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

  return { loading, error, data, weeks: PREVIEW_WEEKS, refresh };
}
