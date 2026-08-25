-- SevenPOS Core Initial Schema Migration (0001_initial_core.sql)
-- Single canonical database schema source for Tauri SQL plugin & SQLite

-- 1. Businesses Table
CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    country_code TEXT NOT NULL,
    fiscal_id TEXT,
    phone TEXT,
    phone_prefix TEXT,
    address TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. Business Settings Table
CREATE TABLE IF NOT EXISTS business_settings (
    business_id TEXT PRIMARY KEY NOT NULL,
    primary_currency TEXT NOT NULL,
    secondary_currency TEXT,
    secondary_currency_enabled INTEGER NOT NULL DEFAULT 0,
    exchange_rate_provider TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'OWNER',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 4. App Metadata Table (for device/onboarding flags)
CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Indices for efficient relations
CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
