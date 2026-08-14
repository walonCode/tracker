import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";

import type { ProjectPage } from "@/types";

interface ProjectPageRow {
  id: number;
  project_id: number;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapProjectPage(row: ProjectPageRow): ProjectPage {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateProjectPageInput {
  projectId: number;
  title: string;
  sortOrder?: number;
}

export async function createProjectPage(
  db: SQLiteDatabase,
  input: CreateProjectPageInput
): Promise<ProjectPage> {
  const result = await db.runAsync(
    "INSERT INTO project_pages (project_id, title, sort_order) VALUES (?, ?, ?)",
    [input.projectId, input.title, input.sortOrder ?? 0]
  );
  const page = await getProjectPageById(db, result.lastInsertRowId);
  if (!page) throw new Error("createProjectPage: failed to load row after insert");
  return page;
}

export async function getProjectPageById(
  db: SQLiteDatabase,
  id: number
): Promise<ProjectPage | null> {
  const row = await db.getFirstAsync<ProjectPageRow>(
    "SELECT * FROM project_pages WHERE id = ?",
    id
  );
  return row ? mapProjectPage(row) : null;
}

export async function listProjectPages(
  db: SQLiteDatabase,
  projectId: number
): Promise<ProjectPage[]> {
  const rows = await db.getAllAsync<ProjectPageRow>(
    "SELECT * FROM project_pages WHERE project_id = ? ORDER BY sort_order ASC, id ASC",
    projectId
  );
  return rows.map(mapProjectPage);
}

export interface UpdateProjectPageInput {
  title?: string;
  sortOrder?: number;
}

export async function updateProjectPage(
  db: SQLiteDatabase,
  id: number,
  input: UpdateProjectPageInput
): Promise<ProjectPage | null> {
  const sets: string[] = [];
  const params: SQLiteBindValue[] = [];

  if (input.title !== undefined) {
    sets.push("title = ?");
    params.push(input.title);
  }
  if (input.sortOrder !== undefined) {
    sets.push("sort_order = ?");
    params.push(input.sortOrder);
  }

  if (sets.length === 0) return getProjectPageById(db, id);

  sets.push("updated_at = datetime('now')");
  params.push(id);
  await db.runAsync(`UPDATE project_pages SET ${sets.join(", ")} WHERE id = ?`, params);
  return getProjectPageById(db, id);
}

/** Hard delete. Cascades to project_blocks. */
export async function deleteProjectPage(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM project_pages WHERE id = ?", id);
}
