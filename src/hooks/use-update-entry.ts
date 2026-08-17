import { useCallback, useState } from "react";

import { getDb } from "@/db/client";
import {
  deleteEntry,
  replaceEntryValues,
  updateEntryDate,
  updateEntryNote,
  type CreateEntryValueInput,
} from "@/db/repositories";
import { toLocalDateKey } from "@/lib/dates";

export interface UpdateEntryDraftInput {
  entryId: number;
  note?: string | null;
  values: CreateEntryValueInput[];
  /** Pass when the entry's day changed (backdating an existing entry). */
  date?: Date;
}

export interface UseUpdateEntryResult {
  saveEdit: (input: UpdateEntryDraftInput) => Promise<void>;
  removeEntry: (entryId: number) => Promise<void>;
  isSaving: boolean;
  error: Error | null;
}

/**
 * Edits or deletes an existing entry — the counterpart to
 * `useCreateEntry` for History's "tap an entry to fix it" flow. Replaces
 * all `entry_values` outright (simpler and always-correct vs. diffing
 * per-field, matching `replaceEntryValues`'s own doc comment), updates the
 * note unconditionally, and only touches `occurred_at`/`local_date` when a
 * new `date` is actually passed.
 */
export function useUpdateEntry(): UseUpdateEntryResult {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveEdit = useCallback(async (input: UpdateEntryDraftInput): Promise<void> => {
    setIsSaving(true);
    setError(null);
    try {
      const db = await getDb();
      await replaceEntryValues(db, input.entryId, input.values);
      await updateEntryNote(db, input.entryId, input.note ?? null);
      if (input.date) {
        await updateEntryDate(db, input.entryId, input.date.toISOString(), toLocalDateKey(input.date));
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const removeEntry = useCallback(async (entryId: number): Promise<void> => {
    setIsSaving(true);
    setError(null);
    try {
      const db = await getDb();
      await deleteEntry(db, entryId);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { saveEdit, removeEntry, isSaving, error };
}
