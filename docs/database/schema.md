# Diccionario de Datos Relacional (SQLite & Supabase)

Especificación técnica del modelo relacional implementado en la aplicación, compatible 1:1 entre el motor local **SQLite (`expo-sqlite`)** y **PostgreSQL en Supabase**.

---

## 1. Diagrama Entidad-Relación (Mermaid)

```mermaid
erDiagram
    daily_logs ||--o{ meal_entries : "contiene (1:N)"
    
    daily_logs {
        INTEGER id PK "Autoincremental"
        TEXT date UK "Formato YYYY-MM-DD"
        INTEGER calories_consumed "Total kcal del día"
        INTEGER target_calories "Umbral objetivo (default 1800)"
        TEXT notes "Notas o desglose general"
        TEXT created_at "ISO 8601 Timestamp"
        TEXT updated_at "ISO 8601 Timestamp"
    }

    meal_entries {
        INTEGER id PK "Autoincremental"
        INTEGER daily_log_id FK "Referencia a daily_logs(id) ON DELETE CASCADE"
        TEXT title "Nombre del plato o comida"
        INTEGER calories "Calorías aportadas"
        TEXT time "Hora de ingesta (ej. 14:30)"
        TEXT created_at "ISO 8601 Timestamp"
    }

    user_settings {
        TEXT key PK "Clave de configuración"
        TEXT value "Valor serializado"
    }
```

---

## 2. Definiciones DDL

### Tabla `daily_logs`
```sql
CREATE TABLE IF NOT EXISTS daily_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  calories_consumed INTEGER NOT NULL DEFAULT 0,
  target_calories INTEGER NOT NULL DEFAULT 1800,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
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
  FOREIGN KEY (daily_log_id) REFERENCES daily_logs(id) ON DELETE CASCADE
);
```

### Tabla `user_settings`
```sql
CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```
