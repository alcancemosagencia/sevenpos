-- SevenPOS Operating Expenses Schema Migration (0008_expenses.sql)
-- Defines Expense Categories, Operating Expenses, Performance Indexes, Unique Constraints, and Default Category Seeds

-- 1. Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    system_key TEXT, -- Stable identifier for defaults: 'RENT', 'UTILITIES', etc. NULL for custom categories
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT uq_expense_category_name UNIQUE (business_id, normalized_name)
);

-- Partial Unique Index for System Keys per business
CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_category_system_key
ON expense_categories(business_id, system_key)
WHERE system_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expense_categories_biz ON expense_categories(business_id, active);

-- 2. Operating Expenses Table
CREATE TABLE IF NOT EXISTS operating_expenses (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    expense_number TEXT NOT NULL,
    expense_sequence INTEGER NOT NULL,
    category_id TEXT NOT NULL,
    category_name_snapshot TEXT NOT NULL,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK(amount > 0),
    currency_code TEXT NOT NULL,
    payment_method_code TEXT NOT NULL CHECK(payment_method_code IN ('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'OTHER')),
    expense_date TEXT NOT NULL,
    supplier_id TEXT,
    supplier_name_snapshot TEXT,
    cash_session_id TEXT,
    cash_movement_id TEXT,
    reference_document TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'RECORDED' CHECK(status = 'RECORDED'),
    idempotency_key TEXT NOT NULL,
    created_by_user_id TEXT NOT NULL,
    created_by_name_snapshot TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id) ON DELETE RESTRICT,
    FOREIGN KEY (cash_movement_id) REFERENCES cash_movements(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_expense_number UNIQUE (business_id, expense_number),
    CONSTRAINT uq_expense_sequence UNIQUE (business_id, expense_sequence),
    CONSTRAINT uq_expense_idempotency UNIQUE (business_id, idempotency_key)
);

-- Performance Indexes for Operating Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_biz_date ON operating_expenses(business_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_biz_category ON operating_expenses(business_id, category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_biz_supplier ON operating_expenses(business_id, supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_biz_session ON operating_expenses(business_id, cash_session_id) WHERE cash_session_id IS NOT NULL;

-- 3. Partial Unique Index on Cash Movements for Operating Expenses
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_movements_expense_cash_out
ON cash_movements(business_id, reference_id)
WHERE reference_type = 'OPERATING_EXPENSE' AND movement_type = 'CASH_OUT';

-- 4. Idempotent Default Expense Category Seeds for Existing Businesses
INSERT OR IGNORE INTO expense_categories (id, business_id, system_key, name, normalized_name, description, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'RENT', 'Arriendo', 'arriendo', 'Arriendo de local u oficinas', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses;

INSERT OR IGNORE INTO expense_categories (id, business_id, system_key, name, normalized_name, description, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'UTILITIES', 'Servicios básicos', 'servicios basicos', 'Luz, agua, gas y servicios generales', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses;

INSERT OR IGNORE INTO expense_categories (id, business_id, system_key, name, normalized_name, description, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'INTERNET_PHONE', 'Internet y telefonía', 'internet y telefonia', 'Conexión a internet y líneas telefónicas', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses;

INSERT OR IGNORE INTO expense_categories (id, business_id, system_key, name, normalized_name, description, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'MARKETING', 'Publicidad y marketing', 'publicidad y marketing', 'Publicidad digital, volantes y promociones', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses;

INSERT OR IGNORE INTO expense_categories (id, business_id, system_key, name, normalized_name, description, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'TRANSPORT', 'Transporte', 'transporte', 'Fletes, combustible y traslados', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses;

INSERT OR IGNORE INTO expense_categories (id, business_id, system_key, name, normalized_name, description, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'MAINTENANCE', 'Mantenimiento', 'mantenimiento', 'Reparaciones y mantenimiento de infraestructura y equipos', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses;

INSERT OR IGNORE INTO expense_categories (id, business_id, system_key, name, normalized_name, description, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'CLEANING', 'Limpieza', 'limpieza', 'Artículos y servicios de aseo', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses;

INSERT OR IGNORE INTO expense_categories (id, business_id, system_key, name, normalized_name, description, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'SUPPLIES', 'Papelería e insumos', 'papeleria e insumos', 'Útiles de oficina, bolsas y consumibles', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses;

INSERT OR IGNORE INTO expense_categories (id, business_id, system_key, name, normalized_name, description, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'PROFESSIONAL_SERVICES', 'Servicios profesionales', 'servicios profesionales', 'Contabilidad, asesorías y servicios legales', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses;

INSERT OR IGNORE INTO expense_categories (id, business_id, system_key, name, normalized_name, description, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'OTHER', 'Otros', 'otros', 'Otros gastos operativos no clasificados', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses;
