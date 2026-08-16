import { useCallback, useEffect, useMemo, useState } from "react";

import { getDb } from "@/db/client";
import {
  getEntriesForDateRange,
  listDomains,
  listProjects,
  listTrackerFields,
  listTrackers,
} from "@/db/repositories";
import { addLocalDays, toLocalDateKey, todayLocalDateKey } from "@/lib/dates";
import type { Domain, EntryWithValues, Project, Tracker, TrackerField } from "@/types";

/**
 * Lower bound for the "all-time" entries query — mirrors
 * `src/hooks/use-history.ts`'s `EARLIEST_LOCAL_DATE` sentinel. Entries are
 * fetched once for the full history (not re-queried per range) and every
 * range (week/month/all-time) is then a cheap client-side slice of that one
 * result set — see the module doc below for why.
 */
const EARLIEST_LOCAL_DATE = "0001-01-01";

export type ReportRange = "week" | "month" | "all";

const RANGE_TRAILING_DAYS: Record<Exclude<ReportRange, "all">, number> = {
  week: 7,
  month: 30,
};

function rangeStartDate(range: ReportRange, today: Date): string {
  if (range === "all") return EARLIEST_LOCAL_DATE;
  return toLocalDateKey(addLocalDays(today, -(RANGE_TRAILING_DAYS[range] - 1)));
}

export interface UseReportsDataResult {
  /** True only for the initial load (no data yet). */
  loading: boolean;
  /** True during a pull-to-refresh re-fetch (data already present). */
  refreshing: boolean;
  error: Error | null;

  range: ReportRange;
  setRange: (range: ReportRange) => void;
  /** Inclusive local-date bounds of the currently selected range. */
  rangeStartDate: string;
  rangeEndDate: string;

  domains: Domain[];
  /** All trackers, including archived ones — historical reports should still
   * account for a tracker that's since been archived. */
  trackers: Tracker[];
  projects: Project[];
  fieldsByTrackerId: Map<number, TrackerField[]>;

  /** Every entry ever recorded, ordered by local_date ASC — the input for
   * streaks, which inherently need full history regardless of the selected
   * range. */
  allEntries: EntryWithValues[];
  /** `allEntries` sliced to `[rangeStartDate, rangeEndDate]` — the input for
   * every range-scoped section (domain totals, trend charts, Finance
   * category breakdown, Projects time-logged summary). */
  entriesInRange: EntryWithValues[];

  refresh: () => void;
}

/**
 * Loads everything the Reports screen's sections need in one pass: the 4
 * domains, every tracker (+ its fields), every project, and every entry ever
 * recorded. Fetching the full entry history once and slicing it client-side
 * per selected range (rather than re-querying per range change) keeps this
 * simple — the data volume for a personal tracker is small, and it means
 * switching week/month/all-time is instant with no re-fetch, and streaks
 * (which always need full history, independent of the range selector) don't
 * need a second query.
 */
export function useReportsData(): UseReportsDataResult {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [domains, setDomains] = useState<Domain[]>([]);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [fieldsByTrackerId, setFieldsByTrackerId] = useState<Map<number, TrackerField[]>>(
    new Map()
  );
  const [allEntries, setAllEntries] = useState<EntryWithValues[]>([]);

  const [range, setRange] = useState<ReportRange>("week");
  // See use-history.ts's identical comment: the fetch effect re-runs off
  // this token (bumped by refresh()) rather than a callback invoked from the
  // effect, so no state is set synchronously during the effect body.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const db = await getDb();
        const [domainRows, trackerRows, projectRows, entryRows] = await Promise.all([
          listDomains(db),
          listTrackers(db, { includeArchived: true }),
          listProjects(db),
          getEntriesForDateRange(db, EARLIEST_LOCAL_DATE, todayLocalDateKey()),
        ]);
        if (cancelled) return;

        const fieldLists = await Promise.all(
          trackerRows.map((tracker) => listTrackerFields(db, tracker.id))
        );
        if (cancelled) return;

        const fieldsMap = new Map<number, TrackerField[]>();
        trackerRows.forEach((tracker, index) => {
          fieldsMap.set(tracker.id, fieldLists[index]);
        });

        setDomains(domainRows);
        setTrackers(trackerRows);
        setProjects(projectRows);
        setFieldsByTrackerId(fieldsMap);
        setAllEntries(entryRows);
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

  const rangeEndDate = todayLocalDateKey();
  const rangeStart = useMemo(() => rangeStartDate(range, new Date()), [range]);

  const entriesInRange = useMemo(
    () =>
      allEntries.filter(
        (entry) => entry.localDate >= rangeStart && entry.localDate <= rangeEndDate
      ),
    [allEntries, rangeStart, rangeEndDate]
  );

  return {
    loading,
    refreshing,
    error,
    range,
    setRange,
    rangeStartDate: rangeStart,
    rangeEndDate,
    domains,
    trackers,
    projects,
    fieldsByTrackerId,
    allEntries,
    entriesInRange,
    refresh,
  };
}
