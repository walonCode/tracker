import { useCallback, useState } from "react";

import { getDb } from "@/db/client";
import {
  createTracker,
  createTrackerField,
  getDomainByKey,
} from "@/db/repositories";
import type {
  DomainKey,
  FieldType,
  Tracker,
  TrackerFieldConfig,
  TrackerFrequency,
} from "@/types";

export interface CreateTrackerFieldDraft {
  name: string;
  label: string;
  type: FieldType;
  unit?: string | null;
  /** Only meaningful (and only persisted) when `type === "scale"`. */
  config?: TrackerFieldConfig | null;
}

export interface CreateTrackerWithFieldsInput {
  domainKey: DomainKey;
  name: string;
  frequency: TrackerFrequency;
  fields: CreateTrackerFieldDraft[];
}

export interface UseCreateTrackerResult {
  createTrackerWithFields: (input: CreateTrackerWithFieldsInput) => Promise<Tracker>;
  isSaving: boolean;
  error: Error | null;
}

/**
 * Creates a new tracker plus all of its fields (from the "New Tracker"
 * field builder), in one transaction. `kind` is intentionally never passed
 * to `createTracker` — it defaults to `"standard"` — since this generic
 * path must never create `prayer`/`project_time` trackers (task 7 brief).
 */
export function useCreateTracker(): UseCreateTrackerResult {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTrackerWithFields = useCallback(
    async (input: CreateTrackerWithFieldsInput): Promise<Tracker> => {
      setIsSaving(true);
      setError(null);
      try {
        const db = await getDb();
        const domain = await getDomainByKey(db, input.domainKey);
        if (!domain) {
          throw new Error(
            `createTrackerWithFields: unknown domain key "${input.domainKey}"`
          );
        }

        let tracker: Tracker | null = null;
        await db.withTransactionAsync(async () => {
          tracker = await createTracker(db, {
            domainId: domain.id,
            name: input.name,
            frequency: input.frequency,
          });

          let sortOrder = 0;
          for (const field of input.fields) {
            await createTrackerField(db, {
              trackerId: tracker.id,
              name: field.name,
              label: field.label,
              type: field.type,
              unit: field.unit ?? null,
              config: field.type === "scale" ? (field.config ?? null) : null,
              sortOrder: sortOrder++,
            });
          }
        });

        if (!tracker) {
          throw new Error("createTrackerWithFields: transaction did not run");
        }
        return tracker;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return { createTrackerWithFields, isSaving, error };
}
