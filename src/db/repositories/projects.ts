import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";

import type { Project, ProjectStatus, Tracker } from "@/types";

import { createTracker } from "./trackers";

interface ProjectRow {
  id: number;
  tracker_id: number;
  title: string;
  status: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    trackerId: row.tracker_id,
    title: row.title,
    status: row.status as ProjectStatus,
    description: row.description,
    color: row.color,
    icon: row.icon,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateProjectInput {
  /** The project's dedicated kind='project_time' tracker. Create it first
   * with createTracker(), or use createProjectWithTracker() below. */
  trackerId: number;
  title: string;
  status?: ProjectStatus;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
}

export async function createProject(
  db: SQLiteDatabase,
  input: CreateProjectInput
): Promise<Project> {
  const result = await db.runAsync(
    `INSERT INTO projects (tracker_id, title, status, description, color, icon)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.trackerId,
      input.title,
      input.status ?? "active",
      input.description ?? null,
      input.color ?? null,
      input.icon ?? null,
    ]
  );
  const project = await getProjectById(db, result.lastInsertRowId);
  if (!project) throw new Error("createProject: failed to load row after insert");
  return project;
}

export interface CreateProjectWithTrackerInput {
  domainId: number;
  title: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
}

/**
 * Convenience wrapper: creates the project's backing kind='project_time'
 * tracker and the project row together, since every project needs exactly
 * one such tracker (see projects.tracker_id in the schema).
 */
export async function createProjectWithTracker(
  db: SQLiteDatabase,
  input: CreateProjectWithTrackerInput
): Promise<{ project: Project; tracker: Tracker }> {
  const tracker = await createTracker(db, {
    domainId: input.domainId,
    name: input.title,
    frequency: "occasional",
    kind: "project_time",
    color: input.color ?? null,
    icon: input.icon ?? null,
  });
  const project = await createProject(db, {
    trackerId: tracker.id,
    title: input.title,
    description: input.description ?? null,
    color: input.color ?? null,
    icon: input.icon ?? null,
  });
  return { project, tracker };
}

export async function getProjectById(
  db: SQLiteDatabase,
  id: number
): Promise<Project | null> {
  const row = await db.getFirstAsync<ProjectRow>(
    "SELECT * FROM projects WHERE id = ?",
    id
  );
  return row ? mapProject(row) : null;
}

export async function listProjects(
  db: SQLiteDatabase,
  options: { status?: ProjectStatus } = {}
): Promise<Project[]> {
  const where = options.status ? "WHERE status = ?" : "";
  const params = options.status ? [options.status] : [];
  const rows = await db.getAllAsync<ProjectRow>(
    `SELECT * FROM projects ${where} ORDER BY updated_at DESC, id DESC`,
    params
  );
  return rows.map(mapProject);
}

export interface UpdateProjectInput {
  title?: string;
  status?: ProjectStatus;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
}

export async function updateProject(
  db: SQLiteDatabase,
  id: number,
  input: UpdateProjectInput
): Promise<Project | null> {
  const sets: string[] = [];
  const params: SQLiteBindValue[] = [];

  if (input.title !== undefined) {
    sets.push("title = ?");
    params.push(input.title);
  }
  if (input.status !== undefined) {
    sets.push("status = ?");
    params.push(input.status);
  }
  if (input.description !== undefined) {
    sets.push("description = ?");
    params.push(input.description);
  }
  if (input.color !== undefined) {
    sets.push("color = ?");
    params.push(input.color);
  }
  if (input.icon !== undefined) {
    sets.push("icon = ?");
    params.push(input.icon);
  }

  if (sets.length === 0) return getProjectById(db, id);

  sets.push("updated_at = datetime('now')");
  params.push(id);
  await db.runAsync(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`, params);
  return getProjectById(db, id);
}

/** Hard delete. Cascades to project_pages/project_blocks; tracker_id is ON DELETE RESTRICT
 * so the backing tracker must be deleted separately if desired. */
export async function deleteProject(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM projects WHERE id = ?", id);
}
