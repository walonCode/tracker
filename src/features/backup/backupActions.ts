import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { exportData, importData } from "@/db/repos/backup";
import type { Db } from "@/db/types";
import { today } from "@/domain/dates";

/** Export data: one JSON file with every table, handed to the system share sheet. */
export async function shareExport(db: Db): Promise<void> {
  const file = new File(Paths.cache, `focus-export-${today()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(await exportData(db)));
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Export data" });
}

/** Import data from a picked export. Returns false when the picker was cancelled. */
export async function pickAndImport(db: Db): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
  if (result.canceled) return false;
  const text = await new File(result.assets[0].uri).text();
  await importData(db, text);
  return true;
}
