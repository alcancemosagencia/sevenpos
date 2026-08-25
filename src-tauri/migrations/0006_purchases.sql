-- SevenPOS Purchases Schema Migration (0006_purchases.sql)
-- Defines Suppliers, Purchase Orders, Purchase Order Items, Purchase Receipts, and Purchase Receipt Items

-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    tax_id TEXT,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT uq_supplier_name UNIQUE (business_id, name)
);

-- 2. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    order_sequence INTEGER NOT NULL,
    supplier_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
    currency_code TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    discount_total INTEGER NOT NULL DEFAULT 0,
    tax_total INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL,
    expected_date TEXT,
    note TEXT,
    created_by_user_id TEXT NOT NULL,
    created_by_name_snapshot TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    ordered_at TEXT,
    completed_at TEXT,
    cancelled_at TEXT,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_po_order_sequence UNIQUE (business_id, order_sequence),
    CONSTRAINT uq_po_order_number UNIQUE (business_id, order_number)
);

-- 3. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    purchase_order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    presentation_id TEXT,
    product_name_snapshot TEXT NOT NULL,
    presentation_name_snapshot TEXT,
    base_unit TEXT NOT NULL,
    presentation_factor INTEGER NOT NULL DEFAULT 1,
    ordered_quantity INTEGER NOT NULL, -- Scaled integer (scale: 1000)
    unit_cost INTEGER NOT NULL,        -- Minor units of currency per purchase/presentation unit
    discount_total INTEGER NOT NULL DEFAULT 0,
    line_total INTEGER NOT NULL,       -- Minor units of currency
    sku_snapshot TEXT,
    barcode_snapshot TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (presentation_id) REFERENCES product_presentations(id) ON DELETE SET NULL
);

-- 4. Purchase Receipts Table (Physical Goods Receipt Document)
CREATE TABLE IF NOT EXISTS purchase_receipts (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    purchase_order_id TEXT NOT NULL,
    receipt_number TEXT NOT NULL,
    receipt_sequence INTEGER NOT NULL,
    received_by_user_id TEXT NOT NULL,
    received_by_name_snapshot TEXT NOT NULL,
    received_at TEXT NOT NULL,
    note TEXT,
    idempotency_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_receipt_sequence UNIQUE (business_id, receipt_sequence),
    CONSTRAINT uq_receipt_number UNIQUE (business_id, receipt_number),
    CONSTRAINT uq_receipt_idempotency UNIQUE (business_id, idempotency_key)
);

-- 5. Purchase Receipt Items Table (Actual Received Quantities & Real Received Costs)
CREATE TABLE IF NOT EXISTS purchase_receipt_items (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    purchase_receipt_id TEXT NOT NULL,
    purchase_order_item_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    presentation_id TEXT,
    received_quantity INTEGER NOT NULL, -- Scaled integer (scale: 1000) in presentation units
    base_quantity INTEGER NOT NULL,     -- Scaled integer (scale: 1000) in base units
    unit_cost INTEGER NOT NULL,         -- Real received unit cost in minor currency
    line_cost_total INTEGER NOT NULL,   -- Minor units of currency
    lot_id TEXT,
    lot_code_snapshot TEXT,
    expiration_date_snapshot TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (purchase_receipt_id) REFERENCES purchase_receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (presentation_id) REFERENCES product_presentations(id) ON DELETE SET NULL,
    FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE SET NULL
);

-- 6. Indexes for High Performance Querying
CREATE INDEX IF NOT EXISTS idx_suppliers_biz_active ON suppliers(business_id, active, name);
CREATE INDEX IF NOT EXISTS idx_po_biz_status ON purchase_orders(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_biz_supplier ON purchase_orders(business_id, supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_receipts_po ON purchase_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON purchase_receipt_items(purchase_receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_po_item ON purchase_receipt_items(purchase_order_item_id);
