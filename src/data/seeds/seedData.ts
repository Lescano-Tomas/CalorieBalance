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
      `INSERT INTO meal_entries (daily_log_id, title, calories, time, created_at, updated_at)
       VALUES (?, ?, ?, '14:30', ?, ?);`,
      res.lastInsertRowId,
      'Menú nutritivo & colación liviana',
      Math.round(sample.calories * 0.6),
      nowIso,
      nowIso
    );
  }

  // Seed default active profile if table is empty
  const profileRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM user_profiles;'
  );
  if (!profileRow || profileRow.count === 0) {
    const nowIso = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO user_profiles (
        name, gender, age, weight_kg, height_cm, activity_level, goal_type,
        bmr, tdee, target_calories, is_active, created_at, updated_at
      ) VALUES ('Valen', 'female', 26, 62, 165, 'moderate', 'deficit_moderate', 1370, 2124, 1824, 1, ?, ?);`,
      nowIso,
      nowIso
    );
  }

  const nowIso = new Date().toISOString();
  await db.runAsync(
    `INSERT OR IGNORE INTO user_settings (key, value, created_at, updated_at) VALUES ('target_calories', '1800', ?, ?);`,
    nowIso,
    nowIso
  );
  await db.runAsync(
    `INSERT OR IGNORE INTO user_settings (key, value, created_at, updated_at) VALUES ('max_reference_calories', '2400', ?, ?);`,
    nowIso,
    nowIso
  );
}

export async function seedDefaultRoutinesAndHabits(db: SQLite.SQLiteDatabase): Promise<void> {
  const nowIso = new Date().toISOString();

  // Check if daily_meal_templates are seeded
  const templateCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM daily_meal_templates;'
  );

  if (!templateCount || templateCount.count === 0) {
    const defaultTemplates = [
      {
        meal_slot: 'desayuno',
        title: 'Desayuno Habitual',
        items: [
          { title: 'Café con leche descremada', quantity: '1 taza (200ml)', calories: 95 },
          { title: 'Tostadas integrales con queso untable light', quantity: '2 unidades', calories: 145 },
        ],
        total_calories: 240,
      },
      {
        meal_slot: 'almuerzo',
        title: 'Almuerzo Habitual',
        items: [
          { title: 'Pechuga grillada', quantity: '150g', calories: 220 },
          { title: 'Ensalada mixta fresca', quantity: '1 plato (150g)', calories: 60 },
          { title: 'Huevo duro', quantity: '1 unidad', calories: 75 },
          { title: 'Rocío vegetal / condimento', quantity: '1 porción', calories: 15 },
        ],
        total_calories: 370,
      },
      {
        meal_slot: 'merienda',
        title: 'Merienda Habitual',
        items: [
          { title: 'Infusión con leche descremada', quantity: '1 taza', calories: 80 },
          { title: 'Tostada integral con queso blanco y mermelada light', quantity: '1 unidad', calories: 120 },
        ],
        total_calories: 200,
      },
      {
        meal_slot: 'cena',
        title: 'Cena Habitual',
        items: [
          { title: 'Milanesa al horno', quantity: '1 unidad (140g)', calories: 250 },
          { title: 'Puré de calabaza casero', quantity: '180g', calories: 120 },
          { title: 'Ensalada verde con rocío vegetal', quantity: '1 porción', calories: 40 },
        ],
        total_calories: 410,
      },
    ];

    for (const t of defaultTemplates) {
      await db.runAsync(
        `INSERT INTO daily_meal_templates (meal_slot, title, items_json, total_calories, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?);`,
        t.meal_slot,
        t.title,
        JSON.stringify(t.items),
        t.total_calories,
        nowIso,
        nowIso
      );
    }
  }

  // Check if user_habits are seeded
  const habitCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM user_habits;'
  );

  if (!habitCount || habitCount.count === 0) {
    const starterHabits = [
      {
        category: 'cooking_fats',
        title: 'Rocío vegetal (Fritolín)',
        description: 'Cocina y saltea con rocío vegetal en spray, sin usar aceite líquido de botella.',
        impact_rule: '5-10 kcal en lugar de 119 kcal por cucharada de aceite común',
      },
      {
        category: 'dairy',
        title: 'Lácteos descremados',
        description: 'Toma leche y yogur siempre descremados (0% o 1% tenor graso).',
        impact_rule: 'Ahorro de ~40-60 kcal por taza respecto a enteros',
      },
      {
        category: 'taste',
        title: 'Café con poco dulce',
        description: 'Endulza infusiones con stevia o 1 cucharadita pequeña de mascabo.',
        impact_rule: '0 a 15 kcal por taza',
      },
    ];

    for (const h of starterHabits) {
      await db.runAsync(
        `INSERT INTO user_habits (category, title, description, impact_rule, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?);`,
        h.category,
        h.title,
        h.description,
        h.impact_rule,
        nowIso,
        nowIso
      );
    }
  }
}
