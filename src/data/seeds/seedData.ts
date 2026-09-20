import * as SQLite from 'expo-sqlite';

export async function seedDemoData(db: SQLite.SQLiteDatabase): Promise<void> {
  const now = new Date();
  
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 7 days of realistic baseline data matching Stitch design
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

    await db.runAsync(
      `INSERT INTO meal_entries (daily_log_id, title, calories, time, created_at)
       VALUES (?, ?, ?, '14:30', ?);`,
      res.lastInsertRowId,
      'Menú nutritivo & colación liviana',
      Math.round(sample.calories * 0.6),
      nowIso
    );
  }

  await db.runAsync(
    `INSERT OR IGNORE INTO user_settings (key, value) VALUES ('target_calories', '1800');`
  );
  await db.runAsync(
    `INSERT OR IGNORE INTO user_settings (key, value) VALUES ('max_reference_calories', '2400');`
  );
}
