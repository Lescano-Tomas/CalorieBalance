import { DailyLog } from '@/types';

export interface DeficitCalculation {
  diff: number;
  isDeficit: boolean;
  absDiff: number;
  percentOfReference: number;
}

export class CalorieCalculator {
  /**
   * Calculates calorie difference, deficit flag, and progress percentage.
   */
  static calculateDeficit(
    consumed: number,
    target: number = 1800,
    maxReference: number = 2400
  ): DeficitCalculation {
    const diff = consumed - target;
    const isDeficit = diff <= 0;
    const absDiff = Math.abs(diff);
    const percent = Math.min(Math.max((consumed / maxReference) * 100, 2), 100);

    return {
      diff,
      isDeficit,
      absDiff,
      percentOfReference: percent,
    };
  }

  /**
   * Aggregates weekly or period metrics.
   */
  static calculatePeriodMetrics(logs: DailyLog[], target: number = 1800) {
    if (logs.length === 0) {
      return {
        totalCalories: 0,
        averageCalories: target,
        averageDiff: 0,
        deficitDaysCount: 0,
        totalDays: 0,
        deficitPercentage: 100,
      };
    }

    const totalCalories = logs.reduce((sum, log) => sum + log.calories_consumed, 0);
    const averageCalories = Math.round(totalCalories / logs.length);
    const averageDiff = averageCalories - target;
    const deficitDaysCount = logs.filter((l) => l.calories_consumed <= l.target_calories).length;
    const deficitPercentage = Math.round((deficitDaysCount / logs.length) * 100);

    return {
      totalCalories,
      averageCalories,
      averageDiff,
      deficitDaysCount,
      totalDays: logs.length,
      deficitPercentage,
    };
  }
}
