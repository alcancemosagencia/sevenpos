-- SevenPOS Cash Management Schema Migration (0005_cash.sql)
-- Defines Cash Registers, Cash Sessions (Shifts), Immutable Cash Movements, Performance Indexes, and Sales Association

-- 1. Cash Registers Table
CREATE TABLE IF NOT EXISTS cash_registers (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT uq_cash_register_name UNIQUE (business_id, name)
);

-- 2. Cash Sessions (Shifts) Table
CREATE TABLE IF NOT EXISTS cash_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    cash_register_id TEXT NOT NULL,
    opened_by_user_id TEXT NOT NULL,
    opened_by_name_snapshot TEXT NOT NULL,
    opened_at TEXT NOT NULL,
    opening_amount INTEGER NOT NULL, -- Audit snapshot
    status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN' | 'CLOSED'
    closed_by_user_id TEXT,
    closed_by_name_snapshot TEXT,
    closed_at TEXT,
    expected_cash_amount INTEGER,
    counted_cash_amount INTEGER,
    difference_amount INTEGER,
    closing_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id) ON DELETE RESTRICT,
    FOREIGN KEY (opened_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (closed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Partial Unique Index: Exactly one OPEN session per cash register
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_cash_session_per_register
ON cash_sessions(business_id, cash_register_id)
WHERE status = 'OPEN';

-- 3. Cash Movements Table (Immutable Financial Ledger)
CREATE TABLE IF NOT EXISTS cash_movements (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    cash_session_id TEXT NOT NULL,
    cash_register_id TEXT NOT NULL,
    movement_type TEXT NOT NULL, -- 'OPENING' | 'SALE_CASH' | 'CASH_IN' | 'CASH_OUT'
    amount INTEGER NOT NULL, -- Strictly positive minor units
    currency_code TEXT NOT NULL,
    reason TEXT NOT NULL,
    note TEXT,
    reference_type TEXT, -- 'SALE' | 'USER' | 'SESSION'
    reference_id TEXT,
    created_by_user_id TEXT NOT NULL,
    created_by_name_snapshot TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id) ON DELETE RESTRICT,
    FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Partial Unique Index: Exactly one SALE_CASH movement per sale reference
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_movements_sale_cash
ON cash_movements(business_id, reference_id)
WHERE reference_type = 'SALE' AND movement_type = 'SALE_CASH';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(business_id, cash_session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_biz_created ON cash_sessions(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_registers_biz ON cash_registers(business_id, active);

-- 4. Alter Sales Table to reference cash_session_id
ALTER TABLE sales ADD COLUMN cash_session_id TEXT REFERENCES cash_sessions(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_sales_cash_session ON sales(business_id, cash_session_id);

-- 5. Seed Default Cash Register for Existing Businesses
INSERT OR IGNORE INTO cash_registers (id, business_id, name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'Caja principal', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses;
