import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import type { CreateTrackerFieldDraft } from "@/hooks/use-create-tracker";
import { useCreateTracker } from "@/hooks/use-create-tracker";
import { DOMAIN_KEYS, DOMAIN_PALETTE } from "@/theme/domain-palette";
import { useAppMaterialColors } from "@/theme/material-colors";
import type { DomainKey, TrackerFrequency } from "@/types";

import { createEmptyFieldRow, FieldBuilder, type FieldBuilderRow } from "./field-builder";

export interface CreateTrackerFormProps {
  /** Called after a tracker is successfully created, with its new id. */
  onCreated?: (trackerId: number) => void;
}

const FREQUENCIES: { value: TrackerFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "occasional", label: "Occasional" },
];

/**
 * "New Tracker" mode: name, one of the 5 fixed domains, a daily/occasional
 * frequency toggle, and the field builder. `kind` is never surfaced here —
 * this path always creates `kind: "standard"` trackers (see
 * `use-create-tracker.ts`); prayer/project_time trackers have their own
 * (non-generic) creation paths outside this task's scope.
 */
export function CreateTrackerForm({ onCreated }: CreateTrackerFormProps) {
  const colors = useAppMaterialColors();
  const { createTrackerWithFields, isSaving, error } = useCreateTracker();

  const [name, setName] = useState("");
  const [domainKey, setDomainKey] = useState<DomainKey>("daily");
  const [frequency, setFrequency] = useState<TrackerFrequency>("daily");
  const [fields, setFields] = useState<FieldBuilderRow[]>([createEmptyFieldRow()]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setValidationError(null);
    const trimmedName = name.trim();
    if (trimmedName === "") {
      setValidationError("Tracker name is required.");
      return;
    }

    const fieldDrafts: CreateTrackerFieldDraft[] = [];
    for (const field of fields) {
      const label = field.label.trim();
      const fieldName = field.name.trim();
      if (label === "" || fieldName === "") {
        setValidationError("Every field needs a name and a label.");
        return;
      }

      let config: CreateTrackerFieldDraft["config"] = null;
      if (field.type === "scale") {
        const min = Number(field.scaleMin);
        const max = Number(field.scaleMax);
        if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
          setValidationError(`"${label}" needs a valid min and max (min less than max).`);
          return;
        }
        config = { min, max };
      }

      fieldDrafts.push({
        name: fieldName,
        label,
        type: field.type,
        unit: field.unit.trim() === "" ? null : field.unit.trim(),
        config,
      });
    }

    const tracker = await createTrackerWithFields({
      domainKey,
      name: trimmedName,
      frequency,
      fields: fieldDrafts,
    });

    setName("");
    setFields([createEmptyFieldRow()]);
    onCreated?.(tracker.id);
  }, [name, domainKey, frequency, fields, createTrackerWithFields, onCreated]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
          Tracker name
        </Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.outline, color: colors.onSurface },
          ]}
          placeholder="e.g. Water Intake"
          placeholderTextColor={colors.onSurfaceVariant}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Domain</Text>
        <View style={styles.chipRow}>
          {DOMAIN_KEYS.map((key) => {
            const active = domainKey === key;
            const entry = DOMAIN_PALETTE[key];
            return (
              <Pressable
                key={key}
                onPress={() => setDomainKey(key)}
                style={[
                  styles.chip,
                  { borderColor: entry.color },
                  active && { backgroundColor: entry.color },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={{ color: active ? "#FFFFFF" : entry.color, fontWeight: "600" }}>
                  {entry.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
          Frequency
        </Text>
        <View style={styles.chipRow}>
          {FREQUENCIES.map((option) => {
            const active = frequency === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setFrequency(option.value)}
                style={[
                  styles.chip,
                  { borderColor: colors.outline },
                  active && {
                    backgroundColor: colors.secondaryContainer,
                    borderColor: colors.secondaryContainer,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={{
                    color: active ? colors.onSecondaryContainer : colors.onSurfaceVariant,
                    fontWeight: "600",
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FieldBuilder fields={fields} onChange={setFields} />

      {validationError || error ? (
        <Text style={{ color: colors.error }}>
          {validationError ?? error?.message}
        </Text>
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
          {isSaving ? "Creating…" : "Create Tracker"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 16, paddingBottom: 24 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  saveButton: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveButtonLabel: { fontSize: 16, fontWeight: "700" },
});
