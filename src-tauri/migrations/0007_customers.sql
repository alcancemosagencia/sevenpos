-- SevenPOS Customers Schema Migration (0007_customers.sql)
-- Defines Customers Table, Performance Indexes, and Sales Association Index

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    last_name TEXT,
    document_type TEXT,
    document_number TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Performance and deduplication lookup indexes
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(business_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_document ON customers(business_id, document_number) WHERE document_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(business_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(business_id, email) WHERE email IS NOT NULL;

-- Sales Customer linkage index for fast customer purchase history lookups
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(business_id, customer_id) WHERE customer_id IS NOT NULL;
