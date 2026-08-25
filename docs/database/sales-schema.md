# SevenPOS Sales Database Schema (0004_sales.sql)

## Tablas y Estructura

### 1. `payment_methods`
- `id TEXT PRIMARY KEY NOT NULL`
- `business_id TEXT NOT NULL REFERENCES businesses(id)`
- `code TEXT NOT NULL` (`CASH`, `DEBIT_CARD`, `CREDIT_CARD`, `TRANSFER`, `OTHER`)
- `name TEXT NOT NULL`
- `active INTEGER NOT NULL DEFAULT 1`
- `allows_change INTEGER NOT NULL DEFAULT 0`
- `sort_order INTEGER NOT NULL DEFAULT 0`
- `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`
- `CONSTRAINT uq_payment_method_code UNIQUE (business_id, code)`

### 2. `sales`
- `id TEXT PRIMARY KEY NOT NULL`
- `business_id TEXT NOT NULL REFERENCES businesses(id)`
- `sale_number TEXT NOT NULL` (`V-000001`)
- `sale_sequence INTEGER NOT NULL`
- `status TEXT NOT NULL DEFAULT 'COMPLETED'`
- `customer_id TEXT`, `customer_name_snapshot TEXT NOT NULL`
- `subtotal INTEGER NOT NULL`, `discount_total INTEGER NOT NULL DEFAULT 0`
- `tax_total INTEGER NOT NULL DEFAULT 0`, `total INTEGER NOT NULL`
- `currency_code TEXT NOT NULL`
- `note TEXT`, `idempotency_key TEXT NOT NULL`
- `created_by_user_id TEXT NOT NULL REFERENCES users(id)`
- `created_by_name_snapshot TEXT NOT NULL`
- `created_at TEXT NOT NULL`, `completed_at TEXT NOT NULL`
- `CONSTRAINT uq_sale_number UNIQUE (business_id, sale_number)`
- `CONSTRAINT uq_sale_sequence UNIQUE (business_id, sale_sequence)`
- `CONSTRAINT uq_sale_idempotency UNIQUE (business_id, idempotency_key)`

### 3. `sale_items`
- `id TEXT PRIMARY KEY NOT NULL`
- `business_id TEXT NOT NULL REFERENCES businesses(id)`
- `sale_id TEXT NOT NULL REFERENCES sales(id)`
- `product_id TEXT NOT NULL REFERENCES products(id)`
- `presentation_id TEXT REFERENCES product_presentations(id)`
- `product_name_snapshot TEXT NOT NULL`, `presentation_name_snapshot TEXT`
- `base_unit TEXT NOT NULL`, `presentation_factor INTEGER NOT NULL DEFAULT 1`
- `quantity INTEGER NOT NULL` (scale: 1000), `inventory_quantity_delta INTEGER NOT NULL`
- `unit_price INTEGER NOT NULL`, `discount_total INTEGER NOT NULL DEFAULT 0`
- `line_total INTEGER NOT NULL`
- `unit_cost_snapshot INTEGER`, `line_cost_total INTEGER`, `cost_quality_snapshot TEXT`
- `sku_snapshot TEXT`, `barcode_snapshot TEXT`, `created_at TEXT NOT NULL`

### 4. `sale_payments`
- `id TEXT PRIMARY KEY NOT NULL`
- `business_id TEXT NOT NULL REFERENCES businesses(id)`
- `sale_id TEXT NOT NULL REFERENCES sales(id)`
- `payment_method_id TEXT NOT NULL REFERENCES payment_methods(id)`
- `payment_method_code TEXT NOT NULL`, `payment_method_name_snapshot TEXT NOT NULL`
- `amount INTEGER NOT NULL`, `currency_code TEXT NOT NULL`
- `received_amount INTEGER`, `change_amount INTEGER`, `created_at TEXT NOT NULL`
