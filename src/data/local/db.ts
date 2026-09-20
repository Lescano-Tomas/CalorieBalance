import * as SQLite from 'expo-sqlite';
import {
  DDL_PRAGMAS,
  DDL_USER_PROFILES,
  DDL_DAILY_LOGS,
  DDL_MEAL_ENTRIES,
  DDL_USER_SETTINGS,
} from '../schemas/tables';
import { seedDemoData } from '../seeds/seedData';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = await SQLite.openDatabaseAsync('calorie_balance.db');
  await initDatabase(dbInstance);
  return dbInstance;
}

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(DDL_PRAGMAS);
  await db.execAsync(DDL_USER_PROFILES);
  await db.execAsync(DDL_DAILY_LOGS);
  await db.execAsync(DDL_MEAL_ENTRIES);
  await db.execAsync(DDL_USER_SETTINGS);

  // Soft migration in case tables were previously created without new columns
  try {
    await db.execAsync('ALTER TABLE daily_logs ADD COLUMN user_id INTEGER;');
  } catch {
    // Column already exists, ignore
  }

  try {
    await db.execAsync('ALTER TABLE meal_entries ADD COLUMN updated_at TEXT;');
  } catch {
    // Column already exists, ignore
  }

  try {
    await db.execAsync('ALTER TABLE user_settings ADD COLUMN created_at TEXT;');
  } catch {
    // Column already exists, ignore
  }

  try {
    await db.execAsync('ALTER TABLE user_settings ADD COLUMN updated_at TEXT;');
  } catch {
    // Column already exists, ignore
  }

  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM daily_logs;'
  );

  if (!countRow || countRow.count === 0) {
    await seedDemoData(db);
  }
}
