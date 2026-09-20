# Diccionario de Datos Relacional (SQLite & Supabase)

Especificación técnica del modelo relacional implementado en la aplicación, compatible 1:1 entre el motor local **SQLite (`expo-sqlite`)** y **PostgreSQL en Supabase**.

> [!IMPORTANT]
> **Regla Permanente de Auditoría**: Todas las tablas y entidades del sistema deben incluir obligatoriamente los campos de auditoría `created_at` y `updated_at` en formato ISO 8601 UTC.

---

## 1. Diagrama Entidad-Relación (Mermaid)

```mermaid
erDiagram
    user_profiles ||--o{ daily_logs : "registra (1:N)"
    daily_logs ||--o{ meal_entries : "contiene (1:N)"
    
    user_profiles {
        INTEGER id PK "Autoincremental"
        TEXT name "Nombre del usuario (ej. Valen)"
        TEXT gender "female | male (para TMB)"
        INTEGER age "Edad en años"
        REAL weight_kg "Peso corporal en kg"
        REAL height_cm "Altura en cm"
        TEXT activity_level "sedentary | light | moderate | active | very_active"
        TEXT goal_type "deficit_moderate | deficit_aggressive | maintenance | surplus_moderate"
        INTEGER bmr "Tasa Metabólica Basal en reposo (kcal)"
        INTEGER tdee "Gasto Energético Total Diario (kcal)"
        INTEGER target_calories "Meta diaria recomendada (kcal)"
        INTEGER is_active "1 = Perfil activo actual"
        TEXT created_at "Timestamp auditoría creación"
        TEXT updated_at "Timestamp auditoría actualización"
    }

    daily_logs {
        INTEGER id PK "Autoincremental"
        INTEGER user_id FK "Referencia a user_profiles(id) ON DELETE CASCADE"
        TEXT date UK "Formato YYYY-MM-DD"
        INTEGER calories_consumed "Total kcal del día"
        INTEGER target_calories "Umbral objetivo para ese día"
        TEXT notes "Notas generales"
        TEXT created_at "Timestamp auditoría creación"
        TEXT updated_at "Timestamp auditoría actualización"
    }

    meal_entries {
        INTEGER id PK "Autoincremental"
        INTEGER daily_log_id FK "Referencia a daily_logs(id) ON DELETE CASCADE"
        TEXT title "Nombre del plato o comida"
        INTEGER calories "Calorías aportadas"
        TEXT time "Hora de ingesta (ej. 14:30)"
        TEXT created_at "Timestamp auditoría creación"
        TEXT updated_at "Timestamp auditoría actualización"
    }

    user_settings {
        TEXT key PK "Clave de configuración"
        TEXT value "Valor serializado"
        TEXT created_at "Timestamp auditoría creación"
        TEXT updated_at "Timestamp auditoría actualización"
    }
```

---

## 2. Definiciones DDL Oficiales

### Tabla `user_profiles`
```sql
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
```

### Tabla `daily_logs`
```sql
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
```

### Tabla `meal_entries`
```sql
CREATE TABLE IF NOT EXISTS meal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  daily_log_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  calories INTEGER NOT NULL,
  time TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (daily_log_id) REFERENCES daily_logs(id) ON DELETE CASCADE
);
```

### Tabla `user_settings`
```sql
CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```
