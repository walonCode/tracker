import { useCallback } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";
import type { FieldType } from "@/types";

/**
 * One in-progress field row in the "New Tracker" field builder. Kept
 * separate from `CreateTrackerFieldDraft` (in `use-create-tracker.ts`)
 * because scale min/max are edited as raw text here (so the user can freely
 * clear/retype them) and only parsed to numbers — with validation — when
 * the whole form is submitted, in `create-tracker-form.tsx`.
 */
export interface FieldBuilderRow {
  key: string;
  name: string;
  label: string;
  type: FieldType;
  unit: string;
  scaleMin: string;
  scaleMax: string;
}

let fieldKeySeq = 0;

export function createEmptyFieldRow(): FieldBuilderRow {
  fieldKeySeq += 1;
  return {
    key: `field-${fieldKeySeq}`,
    name: "",
    label: "",
    type: "number",
    unit: "",
    scaleMin: "1",
    scaleMax: "5",
  };
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "number", label: "Number" },
  { value: "duration", label: "Duration" },
  { value: "text", label: "Text" },
  { value: "boolean", label: "Yes/No" },
  { value: "scale", label: "Scale" },
];

export interface FieldBuilderProps {
  fields: FieldBuilderRow[];
  onChange: (fields: FieldBuilderRow[]) => void;
}

/**
 * Repeating list of field rows: add freely via "+ Add Field", remove any
 * row, reorder with simple up/down buttons. No drag-and-drop — the task
 * brief leaves reordering UX to implementer judgment and explicitly allows
 * "simple up/down or just append-only"; up/down was chosen since it's a
 * small addition over append-only and lets a user fix an ordering mistake
 * without deleting and re-adding rows.
 */
export function FieldBuilder({ fields, onChange }: FieldBuilderProps) {
  const colors = useAppMaterialColors();

  const updateField = useCallback(
    (key: string, patch: Partial<FieldBuilderRow>) => {
      onChange(fields.map((f) => (f.key === key ? { ...f, ...patch } : f)));
    },
    [fields, onChange]
  );

  const removeField = useCallback(
    (key: string) => {
      onChange(fields.filter((f) => f.key !== key));
    },
    [fields, onChange]
  );

  const moveField = useCallback(
    (key: string, direction: -1 | 1) => {
      const index = fields.findIndex((f) => f.key === key);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= fields.length) return;
      const next = [...fields];
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      onChange(next);
    },
    [fields, onChange]
  );

  const addField = useCallback(() => {
    onChange([...fields, createEmptyFieldRow()]);
  }, [fields, onChange]);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
        Fields
      </Text>

      {fields.map((field, index) => (
        <View
          key={field.key}
          style={[styles.row, { borderColor: colors.outlineVariant }]}
        >
          <View style={styles.rowHeader}>
            <Text style={[styles.rowIndex, { color: colors.onSurfaceVariant }]}>
              #{index + 1}
            </Text>
            <View style={styles.rowHeaderActions}>
              <Pressable
                onPress={() => moveField(field.key, -1)}
                disabled={index === 0}
                hitSlop={8}
                accessibilityLabel="Move field up"
              >
                <Text
                  style={{
                    color: index === 0 ? colors.outlineVariant : colors.primary,
                    fontWeight: "700",
                  }}
                >
                  {"↑"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => moveField(field.key, 1)}
                disabled={index === fields.length - 1}
                hitSlop={8}
                accessibilityLabel="Move field down"
              >
                <Text
                  style={{
                    color:
                      index === fields.length - 1
                        ? colors.outlineVariant
                        : colors.primary,
                    fontWeight: "700",
                  }}
                >
                  {"↓"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => removeField(field.key)}
                hitSlop={8}
                accessibilityLabel="Remove field"
              >
                <Text style={{ color: colors.error, fontWeight: "600" }}>
                  Remove
                </Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            style={[
              styles.input,
              { borderColor: colors.outline, color: colors.onSurface },
            ]}
            placeholder="Label (e.g. Amount)"
            placeholderTextColor={colors.onSurfaceVariant}
            value={field.label}
            onChangeText={(text) => updateField(field.key, { label: text })}
          />
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.outline, color: colors.onSurface },
            ]}
            placeholder="Name (e.g. amount_ml, no spaces)"
            placeholderTextColor={colors.onSurfaceVariant}
            autoCapitalize="none"
            value={field.name}
            onChangeText={(text) => updateField(field.key, { name: text })}
          />

          <View style={styles.typeRow}>
            {FIELD_TYPES.map((option) => {
              const active = field.type === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => updateField(field.key, { type: option.value })}
                  style={[
                    styles.typeChip,
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
                      color: active
                        ? colors.onSecondaryContainer
                        : colors.onSurfaceVariant,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {field.type !== "boolean" ? (
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.outline, color: colors.onSurface },
              ]}
              placeholder="Unit (optional, e.g. ml, min, $)"
              placeholderTextColor={colors.onSurfaceVariant}
              value={field.unit}
              onChangeText={(text) => updateField(field.key, { unit: text })}
            />
          ) : null}

          {field.type === "scale" ? (
            <View style={styles.scaleRow}>
              <TextInput
                style={[
                  styles.scaleInput,
                  { borderColor: colors.outline, color: colors.onSurface },
                ]}
                placeholder="Min"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="number-pad"
                value={field.scaleMin}
                onChangeText={(text) => updateField(field.key, { scaleMin: text })}
              />
              <Text style={{ color: colors.onSurfaceVariant }}>to</Text>
              <TextInput
                style={[
                  styles.scaleInput,
                  { borderColor: colors.outline, color: colors.onSurface },
                ]}
                placeholder="Max"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="number-pad"
                value={field.scaleMax}
                onChangeText={(text) => updateField(field.key, { scaleMax: text })}
              />
            </View>
          ) : null}
        </View>
      ))}

      <Pressable
        onPress={addField}
        style={[styles.addButton, { borderColor: colors.primary }]}
      >
        <Text style={{ color: colors.primary, fontWeight: "600" }}>
          + Add Field
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  sectionLabel: { fontSize: 14, fontWeight: "600" },
  row: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowIndex: { fontSize: 12, fontWeight: "600" },
  rowHeaderActions: { flexDirection: "row", gap: 14, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scaleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  scaleInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  addButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
});
