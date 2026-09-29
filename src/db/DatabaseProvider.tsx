import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from "expo-sqlite";
import type { ReactNode } from "react";

import { seedDevData } from "@/dev/seed";

import { DATABASE_NAME, initDatabase } from "./client";
import type { Db } from "./types";

async function onInit(db: SQLiteDatabase): Promise<void> {
  await initDatabase(db);
  if (__DEV__ && process.env.EXPO_PUBLIC_DEV_SEED !== "0") {
    await seedDevData(db);
  }
}

/** Opens `focus.db`, migrates it, and renders children once it is ready. */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={onInit}>
      {children}
    </SQLiteProvider>
  );
}

export function useDb(): Db {
  return useSQLiteContext();
}
