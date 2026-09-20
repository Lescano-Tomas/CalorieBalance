# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Reglas Permanentes del Proyecto (CalorieBalance)

1. **Campos de Auditoría Obligatorios**:
   - Todas las entidades del dominio y tablas de base de datos relacional (SQLite y Supabase) DEBEN incluir sin excepción los campos de auditoría:
     - `created_at TEXT NOT NULL` (Timestamp ISO 8601)
     - `updated_at TEXT NOT NULL` (Timestamp ISO 8601)
   - Siempre que se cree o modifique un registro en base de datos, ambos timestamps deben actualizarse debidamente.
