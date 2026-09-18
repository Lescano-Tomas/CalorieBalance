export interface DailyLog {
  id: number;
  date: string; // YYYY-MM-DD
  calories_consumed: number;
  target_calories: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MealEntry {
  id: number;
  daily_log_id: number;
  title: string;
  calories: number;
  time?: string;
  created_at: string;
}

export interface DailySummary {
  target: number;
  consumed: number;
  diff: number; // positive = surplus, negative = deficit
  isDeficit: boolean;
}

export type PeriodType = 'week' | 'month';

export type ScreenType = 'daily' | 'charts' | 'history';

export interface UserSettings {
  targetCalories: number;
  maxReferenceCalories: number;
  userName: string;
}
