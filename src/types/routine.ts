export interface Routine {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
}

export interface RoutineTracker {
  id: number;
  routineId: number;
  trackerId: number;
  targetValue: number | null;
  targetUnit: string | null;
  sortOrder: number;
}

export interface RoutineLog {
  id: number;
  routineId: number;
  date: string;
  completedAt: string | null;
  note: string | null;
  createdAt: string;
}
