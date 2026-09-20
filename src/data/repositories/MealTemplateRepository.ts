import { getDatabase } from '../local/db';
import { DailyMealTemplate, MealSlot } from '@/types';

export class MealTemplateRepository {
  /**
   * Retrieves all meal routine templates ordered by meal slot progression.
   */
  static async getAllTemplates(): Promise<DailyMealTemplate[]> {
    const db = await getDatabase();
    const templates = await db.getAllAsync<DailyMealTemplate>(
      'SELECT * FROM daily_meal_templates WHERE is_active = 1;'
    );

    // Order: desayuno, almuerzo, merienda, cena
    const order: Record<MealSlot, number> = {
      desayuno: 1,
      almuerzo: 2,
      merienda: 3,
      cena: 4,
    };

    return templates.sort((a, b) => (order[a.meal_slot] || 99) - (order[b.meal_slot] || 99));
  }

  /**
   * Retrieves a template by its slot.
   */
  static async getBySlot(slot: MealSlot): Promise<DailyMealTemplate | null> {
    const db = await getDatabase();
    return await db.getFirstAsync<DailyMealTemplate>(
      'SELECT * FROM daily_meal_templates WHERE meal_slot = ? AND is_active = 1;',
      slot
    );
  }

  /**
   * Updates an existing routine template or creates it if not present.
   */
  static async saveOrUpdateTemplate(
    slot: MealSlot,
    title: string,
    items: Array<{ title: string; quantity: string; calories: number }>,
    totalCalories: number
  ): Promise<DailyMealTemplate> {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    const itemsJson = JSON.stringify(items);

    const existing = await db.getFirstAsync<DailyMealTemplate>(
      'SELECT * FROM daily_meal_templates WHERE meal_slot = ?;',
      slot
    );

    if (existing) {
      await db.runAsync(
        `UPDATE daily_meal_templates
         SET title = ?,
             items_json = ?,
             total_calories = ?,
             updated_at = ?
         WHERE id = ?;`,
        title.trim(),
        itemsJson,
        totalCalories,
        nowIso,
        existing.id
      );

      return {
        ...existing,
        title: title.trim(),
        items_json: itemsJson,
        total_calories: totalCalories,
        updated_at: nowIso,
      };
    } else {
      const res = await db.runAsync(
        `INSERT INTO daily_meal_templates (meal_slot, title, items_json, total_calories, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?);`,
        slot,
        title.trim(),
        itemsJson,
        totalCalories,
        nowIso,
        nowIso
      );

      return {
        id: res.lastInsertRowId,
        meal_slot: slot,
        title: title.trim(),
        items_json: itemsJson,
        total_calories: totalCalories,
        is_active: 1,
        created_at: nowIso,
        updated_at: nowIso,
      };
    }
  }
}
