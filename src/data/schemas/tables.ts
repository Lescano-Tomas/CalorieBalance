export const DDL_PRAGMAS = `
  PRAGMA foreign_keys = ON;
`;

export const DDL_USER_PROFILES = `
  CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    gender TEXT NOT NULL,
    age INTEGER NOT NULL,
    weight_kg REAL NOT NULL,
    height_cm REAL NOT NULL,
    activity_level TEXT NOT NULL,
    goal_type TEXT NOT NULL,
    bmr INTEGER NOT NULL,
    tdee INTEGER NOT NULL,
    target_calories INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const DDL_DAILY_LOGS = `
  CREATE TABLE IF NOT EXISTS daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT NOT NULL UNIQUE,
    calories_consumed INTEGER NOT NULL DEFAULT 0,
    target_calories INTEGER NOT NULL DEFAULT 1800,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
  );
`;

export const DDL_MEAL_ENTRIES = `
  CREATE TABLE IF NOT EXISTS meal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    daily_log_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    calories INTEGER NOT NULL,
    quantity TEXT,
    time TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (daily_log_id) REFERENCES daily_logs(id) ON DELETE CASCADE
  );
`;

export const DDL_USER_SETTINGS = `
  CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const DDL_USER_FOOD_MEMORIES = `
  CREATE TABLE IF NOT EXISTS user_food_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_text TEXT NOT NULL,
    normalized_title TEXT NOT NULL,
    breakdown_json TEXT NOT NULL,
    total_calories INTEGER NOT NULL,
    embedding TEXT,
    times_eaten INTEGER NOT NULL DEFAULT 1,
    last_eaten_at TEXT NOT NULL,
    user_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const DDL_USER_HABITS = `
  CREATE TABLE IF NOT EXISTS user_habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    impact_rule TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const DDL_DAILY_MEAL_TEMPLATES = `
  CREATE TABLE IF NOT EXISTS daily_meal_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_slot TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    items_json TEXT NOT NULL,
    total_calories INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const DDL_CHAT_MESSAGES = `
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL,
    payload_json TEXT,
    status TEXT NOT NULL DEFAULT 'normal',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

