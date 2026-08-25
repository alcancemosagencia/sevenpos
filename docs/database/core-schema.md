# SevenPOS — Documentación del Esquema Core (AG-03)

## Visión General
El esquema técnico de SevenPOS está gestionado exclusivamente por migraciones SQL canónicas versionadas en `src-tauri/migrations/`.
La base de datos SQLite se almacena en el archivo `sevenpos.db` dentro del directorio de datos de la aplicación.

---

## 1. Migración Inicial: `0001_initial_core.sql`

### Tabla: `businesses`
Almacena la identidad y configuración básica del comercio o tienda.

| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` (UUID v4) | NO | Clave primaria única generada offline. |
| `name` | `TEXT` | NO | Razón social o nombre comercial. |
| `country_code` | `TEXT` | NO | Código ISO de 2 letras (`CL`, `CO`, `VE`). |
| `fiscal_id` | `TEXT` | SÍ | Identificación fiscal (RUT, NIT, RIF). Nullable para comercios informales. |
| `phone` | `TEXT` | SÍ | Número telefónico de contacto. |
| `phone_prefix` | `TEXT` | SÍ | Prefijo internacional (`+56`, `+57`, `+58`). |
| `address` | `TEXT` | SÍ | Dirección física del establecimiento. |
| `created_at` | `TEXT` (ISO-8601 UTC) | NO | Fecha y hora de creación. |
| `updated_at` | `TEXT` (ISO-8601 UTC) | NO | Fecha y hora de última modificación. |

---

### Tabla: `business_settings`
Configuración monetaria y regional del negocio.

| Campo | Tipo | Nulo | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `business_id` | `TEXT` (UUID v4) | NO | - | Clave foránea referenciando `businesses(id)` con `ON DELETE CASCADE`. |
| `primary_currency` | `TEXT` | NO | - | Moneda base (`CLP`, `COP`, `VES`, `USD`). |
| `secondary_currency` | `TEXT` | SÍ | NULL | Moneda secundaria de pago (p. ej. `USD`). |
| `secondary_currency_enabled` | `INTEGER` | NO | `0` | Flag booleano (`1` o `0`). |
| `exchange_rate_provider` | `TEXT` | SÍ | NULL | Proveedor de tasa (`BCV`, `MANUAL`). |
| `created_at` | `TEXT` (ISO-8601 UTC) | NO | - | Fecha de creación. |
| `updated_at` | `TEXT` (ISO-8601 UTC) | NO | - | Fecha de modificación. |

---

### Tabla: `users`
Usuarios y operadores del sistema POS.

| Campo | Tipo | Nulo | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` (UUID v4) | NO | - | Clave primaria del usuario. |
| `business_id` | `TEXT` (UUID v4) | NO | - | Clave foránea referenciando `businesses(id)`. |
| `first_name` | `TEXT` | NO | - | Nombre de pila. |
| `last_name` | `TEXT` | SÍ | NULL | Apellido(s). |
| `email` | `TEXT` | SÍ | NULL | Correo electrónico de contacto. |
| `role` | `TEXT` | NO | `'OWNER'` | Rol canónico: `OWNER`, `ADMIN`, `CASHIER`. |
| `active` | `INTEGER` | NO | `1` | Estado de cuenta activo (`1` / `0`). |
| `created_at` | `TEXT` (ISO-8601 UTC) | NO | - | Fecha de registro. |
| `updated_at` | `TEXT` (ISO-8601 UTC) | NO | - | Fecha de actualización. |

*Nota de Seguridad*: El PIN y secretos de autenticación **NO** se almacenan en la tabla `users` ni en SQLite, sino en el Secure Vault (`sevenpos.stronghold`).

---

### Tabla: `app_meta`
Metadatos técnicos locales de inicialización del terminal.

| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `key` | `TEXT` | NO | Clave única de metadato. |
| `value` | `TEXT` | NO | Valor en texto plano o JSON serializado. |
| `updated_at` | `TEXT` (ISO-8601 UTC) | NO | Fecha de última modificación. |

---

## 2. Índices y Restricciones
- `PRAGMA foreign_keys = ON;` activado obligatoriamente en cada conexión abierta.
- `CREATE INDEX idx_users_business_id ON users(business_id);`
- `CREATE INDEX idx_users_role ON users(role);`
