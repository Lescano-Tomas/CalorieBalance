import { getDatabase } from '../local/db';
import { UserProfile } from '@/types';

export class UserProfileRepository {
  /**
   * Retrieves the currently active user profile.
   */
  static async getActiveProfile(): Promise<UserProfile | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<UserProfile>(
      'SELECT * FROM user_profiles WHERE is_active = 1 ORDER BY id DESC LIMIT 1;'
    );
    return row || null;
  }

  /**
   * Creates or replaces an active profile, marking previous ones as inactive.
   */
  static async saveProfile(
    data: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>
  ): Promise<UserProfile> {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    // Deactivate previous profiles
    await db.runAsync('UPDATE user_profiles SET is_active = 0, updated_at = ?;', nowIso);

    const res = await db.runAsync(
      `INSERT INTO user_profiles (
        name, gender, age, weight_kg, height_cm, activity_level, goal_type,
        bmr, tdee, target_calories, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      data.name,
      data.gender,
      data.age,
      data.weight_kg,
      data.height_cm,
      data.activity_level,
      data.goal_type,
      data.bmr,
      data.tdee,
      data.target_calories,
      nowIso,
      nowIso
    );

    return {
      id: res.lastInsertRowId,
      ...data,
      is_active: 1,
      created_at: nowIso,
      updated_at: nowIso,
    };
  }

  /**
   * Updates only the target calories of an existing profile.
   */
  static async updateTargetCalories(id: number, newTarget: number): Promise<void> {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    await db.runAsync(
      'UPDATE user_profiles SET target_calories = ?, updated_at = ? WHERE id = ?;',
      newTarget,
      nowIso,
      id
    );
  }

  /**
   * Updates multiple fields of an active profile with updated_at audit timestamp.
   */
  static async updateProfile(
    id: number,
    data: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    const entries = Object.entries(data).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return;

    const setClauses = entries.map(([k]) => `${k} = ?`).join(', ');
    const values = entries.map(([_, v]) => v);

    await db.runAsync(
      `UPDATE user_profiles SET ${setClauses}, updated_at = ? WHERE id = ?;`,
      ...values,
      nowIso,
      id
    );
  }

  /**
   * Retrieves all profiles.
   */
  static async getAllProfiles(): Promise<UserProfile[]> {
    const db = await getDatabase();
    return await db.getAllAsync<UserProfile>(
      'SELECT * FROM user_profiles ORDER BY id DESC;'
    );
  }
}
