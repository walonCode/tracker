import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";

import type { ProjectBlock, ProjectBlockType } from "@/types";

interface ProjectBlockRow {
  id: number;
  page_id: number;
  type: string;
  content: string | null;
  checked: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapProjectBlock(row: ProjectBlockRow): ProjectBlock {
  return {
    id: row.id,
    pageId: row.page_id,
    type: row.type as ProjectBlockType,
    content: row.content,
    checked: row.checked === null ? null : row.checked === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateProjectBlockInput {
  pageId: number;
  type: ProjectBlockType;
  content?: string | null;
  checked?: boolean | null;
  sortOrder?: number;
}

export async function createProjectBlock(
  db: SQLiteDatabase,
  input: CreateProjectBlockInput
): Promise<ProjectBlock> {
  const result = await db.runAsync(
    `INSERT INTO project_blocks (page_id, type, content, checked, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.pageId,
      input.type,
      input.content ?? null,
      input.checked === undefined || input.checked === null
        ? null
        : input.checked
          ? 1
          : 0,
      input.sortOrder ?? 0,
    ]
  );
  const block = await getProjectBlockById(db, result.lastInsertRowId);
  if (!block) throw new Error("createProjectBlock: failed to load row after insert");
  return block;
}

export async function getProjectBlockById(
  db: SQLiteDatabase,
  id: number
): Promise<ProjectBlock | null> {
  const row = await db.getFirstAsync<ProjectBlockRow>(
    "SELECT * FROM project_blocks WHERE id = ?",
    id
  );
  return row ? mapProjectBlock(row) : null;
}

export async function listProjectBlocks(
  db: SQLiteDatabase,
  pageId: number
): Promise<ProjectBlock[]> {
  const rows = await db.getAllAsync<ProjectBlockRow>(
    "SELECT * FROM project_blocks WHERE page_id = ? ORDER BY sort_order ASC, id ASC",
    pageId
  );
  return rows.map(mapProjectBlock);
}

export interface UpdateProjectBlockInput {
  type?: ProjectBlockType;
  content?: string | null;
  checked?: boolean | null;
  sortOrder?: number;
}

export async function updateProjectBlock(
  db: SQLiteDatabase,
  id: number,
  input: UpdateProjectBlockInput
): Promise<ProjectBlock | null> {
  const sets: string[] = [];
  const params: SQLiteBindValue[] = [];

  if (input.type !== undefined) {
    sets.push("type = ?");
    params.push(input.type);
  }
  if (input.content !== undefined) {
    sets.push("content = ?");
    params.push(input.content);
  }
  if (input.checked !== undefined) {
    sets.push("checked = ?");
    params.push(input.checked === null ? null : input.checked ? 1 : 0);
  }
  if (input.sortOrder !== undefined) {
    sets.push("sort_order = ?");
    params.push(input.sortOrder);
  }

  if (sets.length === 0) return getProjectBlockById(db, id);

  sets.push("updated_at = datetime('now')");
  params.push(id);
  await db.runAsync(`UPDATE project_blocks SET ${sets.join(", ")} WHERE id = ?`, params);
  return getProjectBlockById(db, id);
}

export async function deleteProjectBlock(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM project_blocks WHERE id = ?", id);
}
