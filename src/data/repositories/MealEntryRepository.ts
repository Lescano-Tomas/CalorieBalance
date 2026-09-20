import { getDatabase } from '../local/db';
import { MealEntry } from '@/types';

export class MealEntryRepository {
  static async getByDailyLogId(dailyLogId: number): Promise<MealEntry[]> {
    const db = await getDatabase();
    return await db.getAllAsync<MealEntry>(
      'SELECT * FROM meal_entries WHERE daily_log_id = ? ORDER BY id ASC;',
      dailyLogId
    );
  }

  static async addMeal(
    dailyLogId: number,
    title: string,
    calories: number,
    quantity?: string,
    time?: string
  ): Promise<MealEntry> {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    const res = await db.runAsync(
      `INSERT INTO meal_entries (daily_log_id, title, calories, quantity, time, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      dailyLogId,
      title,
      calories,
      quantity || null,
      time || null,
      nowIso,
      nowIso
    );
    return {
      id: res.lastInsertRowId,
      daily_log_id: dailyLogId,
      title,
      calories,
      quantity: quantity || undefined,
      time,
      created_at: nowIso,
      updated_at: nowIso,
    };
  }

  static async deleteMeal(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM meal_entries WHERE id = ?;', id);
  }
}
