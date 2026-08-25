# Cash Management Schema Specification (0005_cash.sql)

## 1. Tables Overview

### `cash_registers`
| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | NO | Primary Key (UUID) |
| `business_id` | TEXT | NO | Foreign Key $\rightarrow$ `businesses(id)` |
| `name` | TEXT | NO | Register display name ("Caja principal") |
| `active` | INTEGER | NO | Active status (1 = active, 0 = inactive) |
| `created_at` | TEXT | NO | ISO 8601 UTC timestamp |
| `updated_at` | TEXT | NO | ISO 8601 UTC timestamp |

### `cash_sessions`
| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | NO | Primary Key (UUID) |
| `business_id` | TEXT | NO | Foreign Key $\rightarrow$ `businesses(id)` |
| `cash_register_id` | TEXT | NO | Foreign Key $\rightarrow$ `cash_registers(id)` |
| `opened_by_user_id` | TEXT | NO | Foreign Key $\rightarrow$ `users(id)` |
| `opened_by_name_snapshot`| TEXT | NO | Snapshot of cashier name |
| `opened_at` | TEXT | NO | ISO 8601 UTC timestamp |
| `opening_amount` | INTEGER | NO | Minor currency units (audit snapshot) |
| `status` | TEXT | NO | `'OPEN'` or `'CLOSED'` |
| `closed_by_user_id` | TEXT | YES | Foreign Key $\rightarrow$ `users(id)` |
| `closed_by_name_snapshot`| TEXT | YES | Snapshot of closing cashier name |
| `closed_at` | TEXT | YES | ISO 8601 UTC timestamp |
| `expected_cash_amount` | INTEGER | YES | Calculated ledger balance at closure |
| `counted_cash_amount` | INTEGER | YES | Physical counted amount |
| `difference_amount` | INTEGER | YES | Counted - Expected |
| `closing_note` | TEXT | YES | Optional shift notes |
| `created_at` | TEXT | NO | ISO 8601 UTC timestamp |
| `updated_at` | TEXT | NO | ISO 8601 UTC timestamp |

### `cash_movements`
| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | NO | Primary Key (UUID) |
| `business_id` | TEXT | NO | Foreign Key $\rightarrow$ `businesses(id)` |
| `cash_session_id` | TEXT | NO | Foreign Key $\rightarrow$ `cash_sessions(id)` |
| `cash_register_id` | TEXT | NO | Foreign Key $\rightarrow$ `cash_registers(id)` |
| `movement_type` | TEXT | NO | `'OPENING'`, `'SALE_CASH'`, `'CASH_IN'`, `'CASH_OUT'` |
| `amount` | INTEGER | NO | Strictly positive integer in minor units |
| `currency_code` | TEXT | NO | ISO currency code (e.g. 'CLP') |
| `reason` | TEXT | NO | Movement description |
| `note` | TEXT | YES | Optional note |
| `reference_type` | TEXT | YES | `'SALE'`, `'USER'`, `'SESSION'` |
| `reference_id` | TEXT | YES | e.g. `sale.id` |
| `created_by_user_id` | TEXT | NO | Foreign Key $\rightarrow$ `users(id)` |
| `created_by_name_snapshot`| TEXT | NO | User name snapshot |
| `created_at` | TEXT | NO | ISO 8601 UTC timestamp |

---

## 2. Performance & Integrity Indexes

```sql
CREATE UNIQUE INDEX uq_active_cash_session_per_register ON cash_sessions(business_id, cash_register_id) WHERE status = 'OPEN';
CREATE UNIQUE INDEX uq_cash_movements_sale_cash ON cash_movements(business_id, reference_id) WHERE reference_type = 'SALE' AND movement_type = 'SALE_CASH';
CREATE INDEX idx_cash_movements_session ON cash_movements(business_id, cash_session_id, created_at DESC);
CREATE INDEX idx_cash_sessions_biz_created ON cash_sessions(business_id, created_at DESC);
CREATE INDEX idx_sales_cash_session ON sales(business_id, cash_session_id);
```
