import { getDatabase } from '../local/db';
import { UserSettings } from '@/types';

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

  static async getSetting(key: string): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM user_settings WHERE key = ?;',
      key
    );
    return row?.value || null;
  }

  static async setSetting(key: string, value: string): Promise<void> {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO user_settings (key, value, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
      key,
      value,
      nowIso,
      nowIso
    );
  }

  static async getGeminiApiKey(): Promise<string | null> {
    return await this.getSetting('gemini_api_key');
  }

  static async setGeminiApiKey(apiKey: string): Promise<void> {
    await this.setSetting('gemini_api_key', apiKey.trim());
  }
}
