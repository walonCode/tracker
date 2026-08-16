import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getDb } from "@/db/client";
import {
  createEntry,
  deleteEntry,
  getEntriesForDate,
  listTrackerFields,
  listTrackersByKind,
  replaceEntryValues,
  type CreateEntryValueInput,
} from "@/db/repositories";
import { todayLocalDateKey } from "@/lib/dates";
import { ensureSeeded } from "@/screens/today/seed-once";
import { useAppMaterialColors } from "@/theme/material-colors";
import type { EntryWithValues, Tracker, TrackerField } from "@/types";

import { PrayerRow } from "./prayer-row";

const PRAYER_ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
type PrayerKey = (typeof PRAYER_ORDER)[number];

/**
 * Row-heading labels only — purely cosmetic. Which `TrackerField` belongs to
 * which prayer/type is always resolved via the field's `name` suffix
 * (`{prayer}_fard` / `{prayer}_sunnah`, see `src/db/seed.ts`), never by
 * parsing this map or the field's `label`, per the task brief.
 */
const PRAYER_HEADINGS: Record<PrayerKey, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

interface PrayerFieldRow {
  key: PrayerKey;
  heading: string;
  fard: TrackerField;
  sunnah: TrackerField;
}

/**
 * Groups the prayer tracker's 10 flat boolean fields into 5 fard/sunnah
 * pairs, in the fixed `PRAYER_ORDER`. Any prayer missing one of its two
 * fields is skipped defensively — `seedPrayerTracker` in `src/db/seed.ts`
 * guarantees this never happens in practice, all 10 fields are created
 * together in one transaction.
 */
function buildPrayerRows(fields: TrackerField[]): PrayerFieldRow[] {
  const byName = new Map(fields.map((field) => [field.name, field]));
  const rows: PrayerFieldRow[] = [];
  for (const key of PRAYER_ORDER) {
    const fard = byName.get(`${key}_fard`);
    const sunnah = byName.get(`${key}_sunnah`);
    if (!fard || !sunnah) continue;
    rows.push({ key, heading: PRAYER_HEADINGS[key], fard, sunnah });
  }
  return rows;
}

/**
 * Prayer Log — the fixed-layout formSheet modal for the single
 * `kind: "prayer"` tracker (routed here from Today's checklist row and from
 * the Add modal's "Log Entry" list, see `checklist-row.tsx` /
 * `log-entry-form.tsx`). 5 fixed rows (Fajr/Dhuhr/Asr/Maghrib/Isha), each
 * with a Fard and a Sunnah toggle — no generic field-list rendering, no
 * tracker picker.
 *
 * On Save this writes ONE `entries` row (+ up to 10 `entry_values` rows, one
 * per checked toggle) for *today's* local date via the standard
 * `createEntry`/`replaceEntryValues` repository functions — the data layer
 * has zero prayer-specific code; this screen is purely a specialized UI
 * over the same schema a generic 10-boolean-field form would produce.
 * Unchecked toggles are simply omitted from `values` (no `valueBoolean:
 * false` rows) — every reader in this codebase (`computePrayerProgress` in
 * `use-daily-checklist.ts`, `formatPrayerSummary` in `entry-row.tsx`) only
 * ever checks for `valueBoolean === true` and treats a missing value as
 * "not done", so this is a safe, slightly smaller representation.
 *
 * Edit-in-place: on mount this looks up whether an entry already exists for
 * the prayer tracker today (`getEntriesForDate`). If so, Save calls
 * `replaceEntryValues` against that same entry id instead of creating a
 * second one, so re-opening the modal and adjusting today's prayers never
 * produces a duplicate `entries` row for the same tracker+day. If every
 * toggle ends up off, the existing entry is deleted outright (mirroring the
 * generic checklist's "no entry today = not done" convention in
 * `use-daily-checklist.ts`'s `toggleTracker`) rather than left behind empty.
 */
export function PrayerLogScreen() {
  const router = useRouter();
  const colors = useAppMaterialColors();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [rows, setRows] = useState<PrayerFieldRow[]>([]);
  const [existingEntry, setExistingEntry] = useState<EntryWithValues | null>(null);
  const [toggles, setToggles] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const db = await getDb();
        await ensureSeeded(db);

        const today = todayLocalDateKey();
        const [prayerTrackers, todaysEntries] = await Promise.all([
          listTrackersByKind(db, "prayer"),
          getEntriesForDate(db, today),
        ]);

        const prayerTracker = prayerTrackers[0] ?? null;
        if (!prayerTracker) {
          throw new Error("Prayer tracker not found — seeding may not have run yet.");
        }

        const fields = await listTrackerFields(db, prayerTracker.id);
        const prayerRows = buildPrayerRows(fields);
        const todaysPrayerEntry =
          todaysEntries.find((entry) => entry.trackerId === prayerTracker.id) ?? null;

        const initialToggles: Record<number, boolean> = {};
        for (const field of fields) initialToggles[field.id] = false;
        if (todaysPrayerEntry) {
          for (const value of todaysPrayerEntry.values) {
            if (value.valueBoolean === true) initialToggles[value.fieldId] = true;
          }
        }

        if (cancelled) return;
        setTracker(prayerTracker);
        setRows(prayerRows);
        setExistingEntry(todaysPrayerEntry);
        setToggles(initialToggles);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = useCallback((fieldId: number, next: boolean) => {
    setToggles((prev) => ({ ...prev, [fieldId]: next }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!tracker) return;

    setIsSaving(true);
    setError(null);
    try {
      const db = await getDb();
      const values: CreateEntryValueInput[] = rows
        .flatMap((row) => [row.fard, row.sunnah])
        .filter((field) => toggles[field.id] === true)
        .map((field) => ({ fieldId: field.id, valueBoolean: true }));

      if (values.length === 0) {
        if (existingEntry) {
          await deleteEntry(db, existingEntry.id);
        }
      } else if (existingEntry) {
        await replaceEntryValues(db, existingEntry.id, values);
      } else {
        const now = new Date();
        await createEntry(db, {
          trackerId: tracker.id,
          occurredAt: now.toISOString(),
          localDate: todayLocalDateKey(),
          values,
        });
      }

      router.back();
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsSaving(false);
    }
  }, [tracker, rows, toggles, existingEntry, router]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!tracker) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.error }}>
          {error?.message ?? "Prayer tracker not found."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.surface }]}
      contentContainerStyle={styles.content}
    >
      {rows.map((row) => (
        <PrayerRow
          key={row.key}
          heading={row.heading}
          fardValue={toggles[row.fard.id] ?? false}
          onFardChange={(next) => handleToggle(row.fard.id, next)}
          sunnahValue={toggles[row.sunnah.id] ?? false}
          onSunnahChange={(next) => handleToggle(row.sunnah.id, next)}
          colors={colors}
        />
      ))}

      {error ? <Text style={{ color: colors.error }}>{error.message}</Text> : null}

      <Pressable
        onPress={handleSave}
        disabled={isSaving}
        style={[
          styles.saveButton,
          { backgroundColor: colors.primary, opacity: isSaving ? 0.6 : 1 },
        ]}
      >
        <Text style={[styles.saveButtonLabel, { color: colors.onPrimary }]}>
          {isSaving ? "Saving…" : "Save"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  saveButton: { borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  saveButtonLabel: { fontSize: 16, fontWeight: "700" },
});
