export type ProjectStatus = "active" | "paused" | "done" | "archived";
export type ProjectBlockType =
  | "text"
  | "heading"
  | "checklist_item"
  | "divider"
  | "time_log";

export interface Project {
  id: number;
  /** The auto-created kind='project_time' tracker backing this project. */
  trackerId: number;
  title: string;
  status: ProjectStatus;
  description: string | null;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPage {
  id: number;
  projectId: number;
  title: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectBlock {
  id: number;
  pageId: number;
  type: ProjectBlockType;
  content: string | null;
  checked: boolean | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
