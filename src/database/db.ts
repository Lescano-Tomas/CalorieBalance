import * as SQLite from 'expo-sqlite';

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
  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create relational tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      calories_consumed INTEGER NOT NULL DEFAULT 0,
      target_calories INTEGER NOT NULL DEFAULT 1800,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      daily_log_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      calories INTEGER NOT NULL,
      time TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (daily_log_id) REFERENCES daily_logs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Check if we need to seed initial demo data
  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM daily_logs;'
  );

  if (!countRow || countRow.count === 0) {
    await seedDemoData(db);
  }
}

async function seedDemoData(db: SQLite.SQLiteDatabase): Promise<void> {
  const now = new Date();
  
  // Helper to format YYYY-MM-DD
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Seed previous 7 days matching the Stitch UI mockup
  // Lun: 1680, Mar: 1720, Mié: 1510, Jue: 1795, Vie: 1640, Sáb: 1980, Dom: 1890
  const sampleDays = [
    { daysAgo: 6, calories: 1680, notes: 'Menú ligero con colación' },
    { daysAgo: 5, calories: 1720, notes: 'Déficit controlado post-entrenamiento' },
    { daysAgo: 4, calories: 1510, notes: 'Mayor déficit de la semana. Cena proteica' },
    { daysAgo: 3, calories: 1795, notes: 'En el límite del umbral de balance' },
    { daysAgo: 2, calories: 1640, notes: 'Buena hidratación y porciones controladas' },
    { daysAgo: 1, calories: 1720, notes: 'Registro de ayer completado' },
    { daysAgo: 0, calories: 1650, notes: 'Registro de hoy en déficit' },
  ];

  for (const sample of sampleDays) {
    const d = new Date(now);
    d.setDate(now.getDate() - sample.daysAgo);
    const dateStr = formatDate(d);
    const nowIso = new Date().toISOString();

    const res = await db.runAsync(
      `INSERT OR REPLACE INTO daily_logs (date, calories_consumed, target_calories, notes, created_at, updated_at)
       VALUES (?, ?, 1800, ?, ?, ?);`,
      dateStr,
      sample.calories,
      sample.notes,
      nowIso,
      nowIso
    );

    // Add a companion meal entry
    await db.runAsync(
      `INSERT INTO meal_entries (daily_log_id, title, calories, time, created_at)
       VALUES (?, ?, ?, '14:30', ?);`,
      res.lastInsertRowId,
      'Menú nutritivo & colación liviana',
      Math.round(sample.calories * 0.6),
      nowIso
    );
  }

  // Default user settings
  await db.runAsync(
    `INSERT OR IGNORE INTO user_settings (key, value) VALUES ('target_calories', '1800');`
  );
  await db.runAsync(
    `INSERT OR IGNORE INTO user_settings (key, value) VALUES ('max_reference_calories', '2400');`
  );
}
