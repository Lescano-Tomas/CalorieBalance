import {
  GenderType,
  ActivityLevel,
  GoalType,
  GoalCategory,
  GoalIntensity,
  NutritionPlanResult,
} from '@/types';

export class NutritionCalculator {
  /**
   * Calculates Basal Metabolic Rate (BMR / TMB) using the Mifflin-St Jeor equation.
   */
  static calculateBMR(
    gender: GenderType,
    weightKg: number,
    heightCm: number,
    age: number
  ): number {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    const bmr = gender === 'female' ? base - 161 : base + 5;
    return Math.round(bmr);
  }

  /**
   * Calculates Total Daily Energy Expenditure (TDEE / GET).
   */
  static calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
    const multipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const factor = multipliers[activityLevel] || 1.2;
    return Math.round(bmr * factor);
  }

  /**
   * Determines intensity based on calorie adjustment ranges:
   * - 0 kcal: Neutral (Maintenance)
   * - 100 - 300 kcal: Sostenible (Sustainable)
   * - 301 - 500 kcal: Moderado (Moderate)
   * - > 500 kcal: Agresivo (Aggressive)
   */
  static getIntensity(category: GoalCategory, deltaKcal: number): GoalIntensity {
    if (category === 'maintenance' || deltaKcal === 0) {
      return 'neutral';
    }
    if (deltaKcal <= 300) {
      return 'sustainable';
    }
    if (deltaKcal <= 500) {
      return 'moderate';
    }
    return 'aggressive';
  }

  /**
   * Derives a canonical GoalType from category and intensity.
   */
  static deriveGoalType(category: GoalCategory, intensity: GoalIntensity): GoalType {
    if (category === 'maintenance') {
      return 'maintenance';
    }
    const suffix = intensity === 'neutral' ? 'moderate' : intensity;
    return `${category}_${suffix}` as GoalType;
  }

  /**
   * Generates a descriptive summary for the chosen plan.
   */
  static getPlanDescription(category: GoalCategory, intensity: GoalIntensity, deltaKcal: number): string {
    if (category === 'maintenance') {
      return 'Balance calórico neutro para mantener peso y energía estable.';
    }

    if (category === 'deficit') {
      switch (intensity) {
        case 'sustainable':
          return `Déficit sostenible (-${deltaKcal} kcal). Pérdida constante y segura (~1.0 kg/mes) sin fatiga ni hambre extrema.`;
        case 'moderate':
          return `Déficit moderado (-${deltaKcal} kcal). Ritmo balanceado (~1.5 a 2 kg/mes). El estándar recomendado.`;
        case 'aggressive':
          return `Déficit agresivo (-${deltaKcal} kcal). Pérdida rápida de peso (~2.5+ kg/mes). Requiere alta disciplina.`;
        default:
          return `Déficit calórico de -${deltaKcal} kcal.`;
      }
    } else {
      switch (intensity) {
        case 'sustainable':
          return `Superávit sostenible (+${deltaKcal} kcal). Ganancia muscular limpia con mínima acumulación de grasa.`;
        case 'moderate':
          return `Superávit moderado (+${deltaKcal} kcal). Aumento progresivo de fuerza y masa muscular magra.`;
        case 'aggressive':
          return `Superávit agresivo (+${deltaKcal} kcal). Fase de volumen intensivo. Puede acarrear mayor masa grasa.`;
        default:
          return `Superávit calórico de +${deltaKcal} kcal.`;
      }
    }
  }

  /**
   * Calculates plan dynamically using category ('deficit' | 'maintenance' | 'surplus')
   * and custom delta calories.
   */
  static calculatePlanDynamic(
    gender: GenderType,
    weightKg: number,
    heightCm: number,
    age: number,
    activityLevel: ActivityLevel,
    category: GoalCategory,
    deltaKcal: number
  ): NutritionPlanResult {
    const bmr = this.calculateBMR(gender, weightKg, heightCm, age);
    const tdee = this.calculateTDEE(bmr, activityLevel);

    const cleanDelta = category === 'maintenance' ? 0 : Math.max(0, deltaKcal);
    const intensity = this.getIntensity(category, cleanDelta);
    const goalType = this.deriveGoalType(category, intensity);
    const description = this.getPlanDescription(category, intensity, cleanDelta);

    let rawTarget = tdee;
    if (category === 'deficit') {
      rawTarget = tdee - cleanDelta;
    } else if (category === 'surplus') {
      rawTarget = tdee + cleanDelta;
    }

    // Safety floor (prevent dangerously low calories)
    const minSafeCalories = gender === 'female' ? 1200 : 1500;
    const targetCalories = Math.max(rawTarget, minSafeCalories);

    return {
      bmr,
      tdee,
      targetCalories,
      goalType,
      category,
      intensity,
      deltaKcal: cleanDelta,
      description,
    };
  }

  /**
   * Backwards-compatible plan calculation by GoalType.
   */
  static calculatePlan(
    gender: GenderType,
    weightKg: number,
    heightCm: number,
    age: number,
    activityLevel: ActivityLevel,
    goalType: GoalType
  ): NutritionPlanResult {
    let category: GoalCategory = 'deficit';
    let deltaKcal = 300;

    switch (goalType) {
      case 'deficit_sustainable':
        category = 'deficit';
        deltaKcal = 300;
        break;
      case 'deficit_moderate':
        category = 'deficit';
        deltaKcal = 400;
        break;
      case 'deficit_aggressive':
        category = 'deficit';
        deltaKcal = 550;
        break;
      case 'maintenance':
        category = 'maintenance';
        deltaKcal = 0;
        break;
      case 'surplus_sustainable':
        category = 'surplus';
        deltaKcal = 250;
        break;
      case 'surplus_moderate':
        category = 'surplus';
        deltaKcal = 400;
        break;
      case 'surplus_aggressive':
        category = 'surplus';
        deltaKcal = 600;
        break;
    }

    return this.calculatePlanDynamic(
      gender,
      weightKg,
      heightCm,
      age,
      activityLevel,
      category,
      deltaKcal
    );
  }
}
