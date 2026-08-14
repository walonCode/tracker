import { useCallback, useState } from "react";

import { getDb } from "@/db/client";
import { createEntry } from "@/db/repositories";
import type { CreateEntryValueInput } from "@/db/repositories/entries";
import { toLocalDateKey } from "@/lib/dates";
import type { EntryWithValues } from "@/types";

export interface CreateEntryDraftInput {
  trackerId: number;
  note?: string | null;
  values: CreateEntryValueInput[];
}

export interface UseCreateEntryResult {
  saveEntry: (input: CreateEntryDraftInput) => Promise<EntryWithValues>;
  isSaving: boolean;
  error: Error | null;
}

/**
 * Saves a new entry for "right now" — `occurredAt`/`localDate` are derived
 * from the current moment via `@/lib/dates` at save time (per the task
 * brief), so callers only supply the tracker id, optional note, and the
 * per-field values collected by the log-entry form.
 */
export function useCreateEntry(): UseCreateEntryResult {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveEntry = useCallback(
    async (input: CreateEntryDraftInput): Promise<EntryWithValues> => {
      setIsSaving(true);
      setError(null);
      try {
        const db = await getDb();
        const now = new Date();
        return await createEntry(db, {
          trackerId: input.trackerId,
          occurredAt: now.toISOString(),
          localDate: toLocalDateKey(now),
          note: input.note ?? null,
          values: input.values,
        });
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

  return { saveEntry, isSaving, error };
}
