# SevenPOS — Esquema de Base de Datos del Catálogo (0002_catalog.sql)

La migración `0002_catalog.sql` incorpora las tablas operacionales del catálogo en SQLite sin modificar la migración base `0001_initial_core.sql`.

---

## 1. Tablas y Definiciones

### `categories`
```sql
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);
```

### `products`
```sql
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    category_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    barcode TEXT,
    base_unit TEXT NOT NULL DEFAULT 'UNIT',
    sale_price INTEGER NOT NULL,
    cost_price INTEGER,
    minimum_stock INTEGER,
    image_path TEXT,
    featured INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

### `product_presentations`
```sql
CREATE TABLE IF NOT EXISTS product_presentations (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    unit_factor INTEGER NOT NULL DEFAULT 1,
    sale_price INTEGER NOT NULL,
    sku TEXT,
    barcode TEXT,
    image_path TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

### `catalog_identifiers`
```sql
CREATE TABLE IF NOT EXISTS catalog_identifiers (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    identifier_type TEXT NOT NULL, -- 'SKU' | 'BARCODE'
    identifier_value TEXT NOT NULL,
    owner_type TEXT NOT NULL,       -- 'PRODUCT' | 'PRESENTATION'
    owner_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT uq_catalog_identifier UNIQUE (business_id, identifier_type, identifier_value)
);
```

---

## 2. Índices Creados

```sql
CREATE INDEX IF NOT EXISTS idx_categories_business_id ON categories(business_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);

CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

CREATE INDEX IF NOT EXISTS idx_presentations_business_id ON product_presentations(business_id);
CREATE INDEX IF NOT EXISTS idx_presentations_product_id ON product_presentations(product_id);
CREATE INDEX IF NOT EXISTS idx_presentations_active ON product_presentations(active);
CREATE INDEX IF NOT EXISTS idx_presentations_sku ON product_presentations(sku);
CREATE INDEX IF NOT EXISTS idx_presentations_barcode ON product_presentations(barcode);

CREATE INDEX IF NOT EXISTS idx_identifiers_lookup ON catalog_identifiers(business_id, identifier_type, identifier_value);
CREATE INDEX IF NOT EXISTS idx_identifiers_owner ON catalog_identifiers(owner_id);
```
