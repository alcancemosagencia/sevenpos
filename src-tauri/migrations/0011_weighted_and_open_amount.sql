-- SevenPOS Flexible Selling Foundation Migration (0011_weighted_and_open_amount.sql)
-- Adds sale_mode to products, line_type, sale_mode, and weight_grams to sale_items,
-- and safely rebuilds sale_items to allow nullable product_id for OPEN_AMOUNT items.

-- 1. Add sale_mode to products
ALTER TABLE products ADD COLUMN sale_mode TEXT NOT NULL DEFAULT 'UNIT';

-- 2. Safely Rebuild sale_items to allow nullable product_id and add new columns
CREATE TABLE IF NOT EXISTS sale_items_new (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    sale_id TEXT NOT NULL,
    product_id TEXT, -- Nullable for OPEN_AMOUNT items
    presentation_id TEXT,
    product_name_snapshot TEXT NOT NULL,
    presentation_name_snapshot TEXT,
    base_unit TEXT NOT NULL,
    presentation_factor INTEGER NOT NULL DEFAULT 1,
    line_type TEXT NOT NULL DEFAULT 'PRODUCT', -- 'PRODUCT' | 'OPEN_AMOUNT'
    sale_mode TEXT NOT NULL DEFAULT 'UNIT', -- 'UNIT' | 'WEIGHT'
    weight_grams INTEGER, -- Integer grams if sale_mode = 'WEIGHT'
    quantity INTEGER NOT NULL, -- Scaled integer (scale 1000)
    inventory_quantity_delta INTEGER NOT NULL, -- Scaled integer (negative, or 0 for OPEN_AMOUNT)
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
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (presentation_id) REFERENCES product_presentations(id) ON DELETE SET NULL
);

-- Copy existing data with defaults
INSERT INTO sale_items_new (
    id,
    business_id,
    sale_id,
    product_id,
    presentation_id,
    product_name_snapshot,
    presentation_name_snapshot,
    base_unit,
    presentation_factor,
    line_type,
    sale_mode,
    weight_grams,
    quantity,
    inventory_quantity_delta,
    unit_price,
    discount_total,
    line_total,
    unit_cost_snapshot,
    line_cost_total,
    cost_quality_snapshot,
    sku_snapshot,
    barcode_snapshot,
    created_at
)
SELECT
    id,
    business_id,
    sale_id,
    product_id,
    presentation_id,
    product_name_snapshot,
    presentation_name_snapshot,
    base_unit,
    presentation_factor,
    'PRODUCT',
    'UNIT',
    NULL,
    quantity,
    inventory_quantity_delta,
    unit_price,
    discount_total,
    line_total,
    unit_cost_snapshot,
    line_cost_total,
    cost_quality_snapshot,
    sku_snapshot,
    barcode_snapshot,
    created_at
FROM sale_items;

-- Drop old table and rename new table
DROP TABLE sale_items;
ALTER TABLE sale_items_new RENAME TO sale_items;

-- Recreate performance indexes
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_prod ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_biz_line ON sale_items(business_id, line_type);
