import { getDatabase } from '../local/db';
import { DailyLog } from '@/types';

export class DailyLogRepository {
  static async getByDate(date: string): Promise<DailyLog | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<DailyLog>(
      'SELECT * FROM daily_logs WHERE date = ?;',
      date
    );
    return row || null;
  }

  static async saveLog(
    date: string,
    calories: number,
    targetCalories: number = 1800,
    notes?: string,
    userId?: number
  ): Promise<DailyLog> {
    const db = await getDatabase();
    const existing = await this.getByDate(date);
    const nowIso = new Date().toISOString();

    if (existing) {
      await db.runAsync(
        `UPDATE daily_logs 
         SET calories_consumed = ?, target_calories = ?, notes = ?, user_id = COALESCE(?, user_id), updated_at = ?
         WHERE date = ?;`,
        calories,
        targetCalories,
        notes || existing.notes || null,
        userId || null,
        nowIso,
        date
      );
      return (await this.getByDate(date))!;
    } else {
      const res = await db.runAsync(
        `INSERT INTO daily_logs (user_id, date, calories_consumed, target_calories, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        userId || null,
        date,
        calories,
        targetCalories,
        notes || null,
        nowIso,
        nowIso
      );
      return {
        id: res.lastInsertRowId,
        user_id: userId,
        date,
        calories_consumed: calories,
        target_calories: targetCalories,
        notes,
        created_at: nowIso,
        updated_at: nowIso,
      };
    }
  }

  static async deleteLog(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM daily_logs WHERE id = ?;', id);
  }

  static async getAllLogs(): Promise<DailyLog[]> {
    const db = await getDatabase();
    return await db.getAllAsync<DailyLog>(
      'SELECT * FROM daily_logs ORDER BY date DESC;'
    );
  }

  static async getLogsForRange(startDate: string, endDate: string): Promise<DailyLog[]> {
    const db = await getDatabase();
    return await db.getAllAsync<DailyLog>(
      'SELECT * FROM daily_logs WHERE date >= ? AND date <= ? ORDER BY date ASC;',
      startDate,
      endDate
    );
  }

  static async getMonthlyLogs(year: number, month: number): Promise<DailyLog[]> {
    const db = await getDatabase();
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}-%`;
    return await db.getAllAsync<DailyLog>(
      'SELECT * FROM daily_logs WHERE date LIKE ? ORDER BY date ASC;',
      prefix
    );
  }
}
