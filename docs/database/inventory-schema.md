# SevenPOS — Inventory SQLite Schema (Migration 0003)

## Tablas de Inventario

### 1. `inventory_lots`
Metadatos de lotes de productos con fechas de vencimiento.

```sql
CREATE TABLE IF NOT EXISTS inventory_lots (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    lot_code TEXT,
    expiration_date TEXT, -- Formato ISO YYYY-MM-DD
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT uq_lot_code UNIQUE (business_id, product_id, lot_code)
);
```

### 2. `inventory_movements`
Ledger inmutable de todos los movimientos de inventario del negocio.

```sql
CREATE TABLE IF NOT EXISTS inventory_movements (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    lot_id TEXT,
    movement_type TEXT NOT NULL, -- 'OPENING' | 'ENTRY' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'WASTE'
    quantity_delta INTEGER NOT NULL, -- Scaled integer (escala 1000)
    unit_cost INTEGER,              -- Minor units de moneda
    total_cost INTEGER,             -- Minor units de moneda
    reason_code TEXT,               -- 'PHYSICAL_COUNT' | 'DAMAGED' | 'EXPIRED' | 'LOST' | 'INTERNAL_USE' | 'DATA_CORRECTION' | 'OTHER'
    note TEXT,
    reference_type TEXT,            -- 'PURCHASE_RECEIPT' | 'SALE' | 'SALE_RETURN' | 'DATA_CORRECTION'
    reference_id TEXT,
    created_by_user_id TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
);
```

### 3. Índices de Rendimiento
```sql
CREATE INDEX IF NOT EXISTS idx_movements_biz_prod_occurred ON inventory_movements(business_id, product_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_movements_biz_occurred ON inventory_movements(business_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_movements_lot ON inventory_movements(product_id, lot_id);
CREATE INDEX IF NOT EXISTS idx_lots_biz_prod ON inventory_lots(business_id, product_id);
CREATE INDEX IF NOT EXISTS idx_lots_biz_exp ON inventory_lots(business_id, expiration_date);
```

### 4. Transformación de `minimum_stock` (AG-04 a AG-05)
```sql
UPDATE products 
SET minimum_stock = minimum_stock * 1000 
WHERE minimum_stock IS NOT NULL;
```
