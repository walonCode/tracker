import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { emptyFieldDraftValue, FieldInput, type FieldDraftValue } from "@/components/field-input";
import { getDb } from "@/db/client";
import { listDomains, listTrackerFields, listTrackers } from "@/db/repositories";
import { useCreateEntry } from "@/hooks/use-create-entry";
import { DOMAIN_PALETTE } from "@/theme/domain-palette";
import { useAppMaterialColors } from "@/theme/material-colors";
import type { Domain, Tracker, TrackerField } from "@/types";

/**
 * "Log Entry" mode: pick a tracker, fill its fields, save.
 *
 * The tracker list intentionally never includes a `kind === "project_time"`
 * row (Projects UI doesn't exist yet — see the task brief) and shows the
 * `kind === "prayer"` tracker as a distinct pinned entry, separate from the
 * regular `kind === "standard"` list, whose only action is
 * `router.replace("/prayer-log")` — it never renders the generic
 * field-filling form below, since the prayer tracker has its own dedicated
 * entry point.
 */
export function LogEntryForm() {
  const colors = useAppMaterialColors();
  const router = useRouter();
  const { saveEntry, isSaving, error } = useCreateEntry();

  const [isLoading, setIsLoading] = useState(true);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [domainsById, setDomainsById] = useState<Map<number, Domain>>(new Map());

  const [selectedTracker, setSelectedTracker] = useState<Tracker | null>(null);
  const [fields, setFields] = useState<TrackerField[]>([]);
  const [note, setNote] = useState("");
  const [values, setValues] = useState<Record<number, FieldDraftValue>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await getDb();
      const [allTrackers, allDomains] = await Promise.all([
        listTrackers(db),
        listDomains(db),
      ]);
      if (cancelled) return;
      setTrackers(allTrackers);
      setDomainsById(new Map(allDomains.map((d) => [d.id, d])));
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const prayerTracker = useMemo(
    () => trackers.find((t) => t.kind === "prayer") ?? null,
    [trackers]
  );
  const pickableTrackers = useMemo(
    () => trackers.filter((t) => t.kind !== "prayer" && t.kind !== "project_time"),
    [trackers]
  );

  const selectTracker = useCallback(
    async (tracker: Tracker) => {
      if (tracker.kind === "prayer") {
        router.replace("/prayer-log");
        return;
      }
      const db = await getDb();
      const trackerFields = await listTrackerFields(db, tracker.id);
      setSelectedTracker(tracker);
      setFields(trackerFields);
      setNote("");
      setValidationError(null);
      setValues(
        Object.fromEntries(trackerFields.map((f) => [f.id, emptyFieldDraftValue()]))
      );
    },
    [router]
  );

  const handleSave = useCallback(async () => {
    if (!selectedTracker) return;
    setValidationError(null);

    const isFieldEmpty = (v: FieldDraftValue) =>
      v.valueNumber === null && v.valueText === null && v.valueBoolean === null;
    const hasAnyValue = fields.some((f) => !isFieldEmpty(values[f.id] ?? emptyFieldDraftValue()));
    if (fields.length > 0 && !hasAnyValue && note.trim() === "") {
      setValidationError("Fill in at least one field or add a note before saving.");
      return;
    }

    await saveEntry({
      trackerId: selectedTracker.id,
      note: note.trim() === "" ? null : note.trim(),
      values: fields.map((f) => ({
        fieldId: f.id,
        ...(values[f.id] ?? emptyFieldDraftValue()),
      })),
    });
    router.back();
  }, [selectedTracker, fields, values, note, saveEntry, router]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!selectedTracker) {
    return (
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {prayerTracker ? (
          <Pressable
            onPress={() => selectTracker(prayerTracker)}
            style={[styles.trackerRow, { borderColor: colors.outlineVariant }]}
          >
            <Text style={[styles.trackerName, { color: colors.onSurface }]}>Prayer</Text>
            <Text style={[styles.trackerMeta, { color: colors.onSurfaceVariant }]}>
              Opens the dedicated prayer log
            </Text>
          </Pressable>
        ) : null}

        {pickableTrackers.length === 0 && !prayerTracker ? (
          <Text style={{ color: colors.onSurfaceVariant }}>
            No trackers yet — switch to &quot;New Tracker&quot; to create one.
          </Text>
        ) : null}

        {pickableTrackers.map((tracker) => {
          const domain = domainsById.get(tracker.domainId);
          const swatch = domain ? DOMAIN_PALETTE[domain.key]?.color : undefined;
          return (
            <Pressable
              key={tracker.id}
              onPress={() => selectTracker(tracker)}
              style={[styles.trackerRow, { borderColor: colors.outlineVariant }]}
            >
              <View style={styles.trackerRowHeader}>
                {swatch ? <View style={[styles.dot, { backgroundColor: swatch }]} /> : null}
                <Text style={[styles.trackerName, { color: colors.onSurface }]}>
                  {tracker.name}
                </Text>
              </View>
              {domain ? (
                <Text style={[styles.trackerMeta, { color: colors.onSurfaceVariant }]}>
                  {domain.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => setSelectedTracker(null)}>
        <Text style={{ color: colors.primary }}>{"← Choose a different tracker"}</Text>
      </Pressable>
      <Text style={[styles.formTitle, { color: colors.onSurface }]}>
        {selectedTracker.name}
      </Text>

      {fields.map((field) => (
        <View key={field.id} style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
            {field.label}
          </Text>
          <FieldInput
            field={field}
            value={values[field.id] ?? emptyFieldDraftValue()}
            onChange={(next) =>
              setValues((prev) => ({ ...prev, [field.id]: next }))
            }
          />
        </View>
      ))}

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
          Note (optional)
        </Text>
        <TextInput
          style={[
            styles.noteInput,
            { borderColor: colors.outline, color: colors.onSurface },
          ]}
          value={note}
          onChangeText={setNote}
          placeholder="Add a note"
          placeholderTextColor={colors.onSurfaceVariant}
          multiline
        />
      </View>

      {validationError || error ? (
        <Text style={{ color: colors.error }}>{validationError ?? error?.message}</Text>
      ) : null}

      <Pressable
        onPress={handleSave}
        disabled={isSaving}
        style={[
          styles.saveButton,
          { backgroundColor: colors.primary, opacity: isSaving ? 0.6 : 1 },
        ]}
      >
        <Text style={[styles.saveButtonLabel, { color: colors.onPrimary }]}>
          {isSaving ? "Saving…" : "Save Entry"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 24 },
  trackerRow: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 4 },
  trackerRowHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  trackerName: { fontSize: 16, fontWeight: "600" },
  trackerMeta: { fontSize: 13 },
  formTitle: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    minHeight: 44,
  },
  saveButton: { borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  saveButtonLabel: { fontSize: 16, fontWeight: "700" },
});
