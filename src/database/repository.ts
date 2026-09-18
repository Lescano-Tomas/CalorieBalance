import { getDatabase } from './db';
import { DailyLog, MealEntry, UserSettings } from '../types';

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
    notes?: string
  ): Promise<DailyLog> {
    const db = await getDatabase();
    const existing = await this.getByDate(date);
    const nowIso = new Date().toISOString();

    if (existing) {
      await db.runAsync(
        `UPDATE daily_logs 
         SET calories_consumed = ?, target_calories = ?, notes = ?, updated_at = ?
         WHERE date = ?;`,
        calories,
        targetCalories,
        notes || existing.notes || null,
        nowIso,
        date
      );
      return (await this.getByDate(date))!;
    } else {
      const res = await db.runAsync(
        `INSERT INTO daily_logs (date, calories_consumed, target_calories, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        date,
        calories,
        targetCalories,
        notes || null,
        nowIso,
        nowIso
      );
      return {
        id: res.lastInsertRowId,
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
    time?: string
  ): Promise<MealEntry> {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    const res = await db.runAsync(
      `INSERT INTO meal_entries (daily_log_id, title, calories, time, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      dailyLogId,
      title,
      calories,
      time || null,
      nowIso
    );
    return {
      id: res.lastInsertRowId,
      daily_log_id: dailyLogId,
      title,
      calories,
      time,
      created_at: nowIso,
    };
  }

  static async deleteMeal(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM meal_entries WHERE id = ?;', id);
  }
}

export class SettingsRepository {
  static async getSettings(): Promise<UserSettings> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM user_settings;'
    );
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.key, r.value);
    }
    return {
      targetCalories: parseInt(map.get('target_calories') || '1800', 10),
      maxReferenceCalories: parseInt(map.get('max_reference_calories') || '2400', 10),
      userName: map.get('user_name') || 'Usuario',
    };
  }

  static async setSetting(key: string, value: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?);`,
      key,
      value
    );
  }
}
