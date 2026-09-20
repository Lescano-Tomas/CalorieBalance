import {
  GenderType,
  ActivityLevel,
  GoalType,
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
   * Calculates target calories based on BMR, TDEE, and user's chosen goal.
   */
  static calculatePlan(
    gender: GenderType,
    weightKg: number,
    heightCm: number,
    age: number,
    activityLevel: ActivityLevel,
    goalType: GoalType
  ): NutritionPlanResult {
    const bmr = this.calculateBMR(gender, weightKg, heightCm, age);
    const tdee = this.calculateTDEE(bmr, activityLevel);

    let targetCalories = tdee;
    let description = 'Mantenimiento del peso actual';

    switch (goalType) {
      case 'deficit_moderate':
        targetCalories = tdee - 300;
        description = 'Déficit sostenible (~1.2 kg pérdida de grasa al mes)';
        break;
      case 'deficit_aggressive':
        targetCalories = tdee - 500;
        description = 'Déficit marcado (~2.0 kg pérdida de grasa al mes)';
        break;
      case 'maintenance':
        targetCalories = tdee;
        description = 'Balance calórico neutro para mantener peso';
        break;
      case 'surplus_moderate':
        targetCalories = tdee + 300;
        description = 'Superávit controlado para aumento de masa muscular magra';
        break;
    }

    // Safety floor (prevent dangerously low calories)
    const minSafeCalories = gender === 'female' ? 1200 : 1500;
    targetCalories = Math.max(targetCalories, minSafeCalories);

    return {
      bmr,
      tdee,
      targetCalories,
      goalType,
      description,
    };
  }
}
