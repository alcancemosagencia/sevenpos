-- SevenPOS Sales Schema Migration (0004_sales.sql)
-- Defines Payment Methods, Sales Master, Sale Items, Sale Payments, Performance Indexes, and Initial Seeds

-- 1. Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    code TEXT NOT NULL, -- 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'TRANSFER' | 'OTHER'
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    allows_change INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT uq_payment_method_code UNIQUE (business_id, code)
);

-- 2. Sales Master Table
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    sale_number TEXT NOT NULL,
    sale_sequence INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED', -- 'COMPLETED' | 'VOIDED'
    customer_id TEXT,
    customer_name_snapshot TEXT NOT NULL DEFAULT 'Consumidor final',
    subtotal INTEGER NOT NULL,
    discount_total INTEGER NOT NULL DEFAULT 0,
    tax_total INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL,
    currency_code TEXT NOT NULL,
    note TEXT,
    idempotency_key TEXT NOT NULL,
    created_by_user_id TEXT NOT NULL,
    created_by_name_snapshot TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_sale_number UNIQUE (business_id, sale_number),
    CONSTRAINT uq_sale_sequence UNIQUE (business_id, sale_sequence),
    CONSTRAINT uq_sale_idempotency UNIQUE (business_id, idempotency_key)
);

-- 3. Sale Items Table
CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    presentation_id TEXT,
    product_name_snapshot TEXT NOT NULL,
    presentation_name_snapshot TEXT,
    base_unit TEXT NOT NULL,
    presentation_factor INTEGER NOT NULL DEFAULT 1,
    quantity INTEGER NOT NULL, -- Scaled integer (scale 1000)
    inventory_quantity_delta INTEGER NOT NULL, -- Scaled integer (negative)
    unit_price INTEGER NOT NULL,
    discount_total INTEGER NOT NULL DEFAULT 0,
    line_total INTEGER NOT NULL,
    unit_cost_snapshot INTEGER,
    line_cost_total INTEGER,
    cost_quality_snapshot TEXT DEFAULT 'REFERENCE', -- 'REAL' | 'REFERENCE' | 'UNKNOWN'
    sku_snapshot TEXT,
    barcode_snapshot TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (presentation_id) REFERENCES product_presentations(id) ON DELETE SET NULL
);

-- 4. Sale Payments Table
CREATE TABLE IF NOT EXISTS sale_payments (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    sale_id TEXT NOT NULL,
    payment_method_id TEXT NOT NULL,
    payment_method_code TEXT NOT NULL,
    payment_method_name_snapshot TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency_code TEXT NOT NULL,
    received_amount INTEGER,
    change_amount INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sales_biz_created ON sales(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_biz_number ON sales(business_id, sale_number);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_prod ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_biz ON payment_methods(business_id, active);
CREATE INDEX IF NOT EXISTS idx_movements_reference ON inventory_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_movements_biz_type ON inventory_movements(business_id, movement_type);

-- 6. Seed Default Payment Methods for Existing Businesses
INSERT OR IGNORE INTO payment_methods (id, business_id, code, name, active, allows_change, sort_order, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'CASH', 'Efectivo', 1, 1, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses
UNION ALL
SELECT lower(hex(randomblob(16))), id, 'DEBIT_CARD', 'Tarjeta de débito', 1, 0, 2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses
UNION ALL
SELECT lower(hex(randomblob(16))), id, 'CREDIT_CARD', 'Tarjeta de crédito', 1, 0, 3, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses
UNION ALL
SELECT lower(hex(randomblob(16))), id, 'TRANSFER', 'Transferencia bancaria', 1, 0, 4, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses
UNION ALL
SELECT lower(hex(randomblob(16))), id, 'OTHER', 'Otro', 1, 0, 5, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now') FROM businesses;
