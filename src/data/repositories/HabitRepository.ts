import { getDatabase } from '../local/db';
import { UserHabit, HabitCategory } from '@/types';

export class HabitRepository {
  /**
   * Returns all habits ordered by creation date.
   */
  static async getAllHabits(): Promise<UserHabit[]> {
    const db = await getDatabase();
    return await db.getAllAsync<UserHabit>(
      'SELECT * FROM user_habits ORDER BY is_active DESC, id ASC;'
    );
  }

  /**
   * Returns only active habits (used for injecting into AI system prompts).
   */
  static async getActiveHabits(): Promise<UserHabit[]> {
    const db = await getDatabase();
    return await db.getAllAsync<UserHabit>(
      'SELECT * FROM user_habits WHERE is_active = 1 ORDER BY id ASC;'
    );
  }

  /**
   * Adds a new culinary habit or taste preference.
   */
  static async addHabit(
    category: HabitCategory,
    title: string,
    description: string,
    impactRule?: string
  ): Promise<UserHabit> {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const res = await db.runAsync(
      `INSERT INTO user_habits (category, title, description, impact_rule, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?);`,
      category,
      title.trim(),
      description.trim(),
      impactRule ? impactRule.trim() : null,
      nowIso,
      nowIso
    );

    return {
      id: res.lastInsertRowId,
      category,
      title: title.trim(),
      description: description.trim(),
      impact_rule: impactRule ? impactRule.trim() : undefined,
      is_active: 1,
      created_at: nowIso,
      updated_at: nowIso,
    };
  }

  /**
   * Updates an existing habit.
   */
  static async updateHabit(
    id: number,
    fields: {
      category?: HabitCategory;
      title?: string;
      description?: string;
      impactRule?: string;
      isActive?: boolean;
    }
  ): Promise<void> {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const existing = await db.getFirstAsync<UserHabit>(
      'SELECT * FROM user_habits WHERE id = ?;',
      id
    );
    if (!existing) return;

    await db.runAsync(
      `UPDATE user_habits
       SET category = ?,
           title = ?,
           description = ?,
           impact_rule = ?,
           is_active = ?,
           updated_at = ?
       WHERE id = ?;`,
      fields.category ?? existing.category,
      fields.title ? fields.title.trim() : existing.title,
      fields.description ? fields.description.trim() : existing.description,
      fields.impactRule !== undefined ? (fields.impactRule || null) : (existing.impact_rule || null),
      fields.isActive !== undefined ? (fields.isActive ? 1 : 0) : existing.is_active,
      nowIso,
      id
    );
  }

  /**
   * Toggles the active status of a habit.
   */
  static async toggleHabit(id: number, currentActive: boolean): Promise<void> {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    await db.runAsync(
      'UPDATE user_habits SET is_active = ?, updated_at = ? WHERE id = ?;',
      currentActive ? 0 : 1,
      nowIso,
      id
    );
  }

  /**
   * Deletes a habit by id.
   */
  static async deleteHabit(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM user_habits WHERE id = ?;', id);
  }
}
