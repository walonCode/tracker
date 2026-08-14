export interface Goal {
  id: number;
  trackerId: number;
  fieldId: number | null;
  targetValue: number;
  targetUnit: string | null;
  targetDate: string | null;
  achievedAt: string | null;
  createdAt: string;
}
