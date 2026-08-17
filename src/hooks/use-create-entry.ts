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
  /**
   * Which local day to log against. Defaults to "right now" when omitted —
   * pass an explicit date to backdate an entry (e.g. logging something
   * forgotten yesterday). `occurredAt` always reflects the actual moment of
   * saving; only the calendar day (`localDate`) is backdated, matching how
   * every other reader in this codebase groups by `localDate`.
   */
  date?: Date;
}

export interface UseCreateEntryResult {
  saveEntry: (input: CreateEntryDraftInput) => Promise<EntryWithValues>;
  isSaving: boolean;
  error: Error | null;
}

/**
 * Saves a new entry. `occurredAt` is always derived from the current moment
 * via `@/lib/dates`; `localDate` defaults to today but can be overridden via
 * `date` to backdate an entry to an earlier day.
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
          localDate: toLocalDateKey(input.date ?? now),
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
