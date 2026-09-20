export type GenderType = 'female' | 'male';

export type ActivityLevel =
  | 'sedentary'   // Oficina, poco o nulo ejercicio
  | 'light'       // Ejercicio ligero 1-3 días/semana
  | 'moderate'    // Ejercicio moderado 3-5 días/semana
  | 'active'      // Ejercicio intenso 6-7 días/semana
  | 'very_active'; // Atleta o doble jornada de entrenamiento

export type GoalCategory = 'deficit' | 'maintenance' | 'surplus';
export type GoalIntensity = 'sustainable' | 'moderate' | 'aggressive' | 'neutral';

export type GoalType =
  | 'deficit_sustainable'
  | 'deficit_moderate'
  | 'deficit_aggressive'
  | 'maintenance'
  | 'surplus_sustainable'
  | 'surplus_moderate'
  | 'surplus_aggressive';

export interface UserProfile {
  id: number;
  name: string;
  gender: GenderType;
  age: number;
  weight_kg: number;
  height_cm: number;
  activity_level: ActivityLevel;
  goal_type: GoalType;
  bmr: number;
  tdee: number;
  target_calories: number;
  is_active: number; // 1 = true, 0 = false
  // Mandatory audit fields
  created_at: string;
  updated_at: string;
}

export interface NutritionPlanResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  goalType: GoalType;
  category: GoalCategory;
  intensity: GoalIntensity;
  deltaKcal: number;
  description: string;
}

export interface DailyLog {
  id: number;
  user_id?: number;
  date: string; // YYYY-MM-DD
  calories_consumed: number;
  target_calories: number;
  notes?: string;
  // Mandatory audit fields
  created_at: string;
  updated_at: string;
}

export interface MealEntry {
  id: number;
  daily_log_id: number;
  title: string;
  calories: number;
  quantity?: string; // ej: "150g", "200g", "2 huevos", "1 taza"
  time?: string;
  // Mandatory audit fields
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  target: number;
  consumed: number;
  diff: number;
  isDeficit: boolean;
}

export interface UserSettings {
  targetCalories: number;
  maxReferenceCalories: number;
  userName: string;
  // Mandatory audit fields
  created_at?: string;
  updated_at?: string;
}
