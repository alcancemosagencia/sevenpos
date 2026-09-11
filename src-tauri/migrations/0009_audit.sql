-- SevenPOS Immutable Audit Trail Schema Migration (0009_audit.sql)
-- Append-only operational audit log, security triggers, and high-performance indexes

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY NOT NULL,
    business_id TEXT NOT NULL,
    event_category TEXT NOT NULL CHECK(event_category IN ('AUTH', 'DEVICE', 'SALES', 'CASH', 'INVENTORY', 'CATALOG', 'PURCHASES', 'EXPENSES', 'CUSTOMERS', 'SECURITY', 'SYSTEM')),
    event_type TEXT NOT NULL,
    action TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'INFO' CHECK(severity IN ('INFO', 'WARNING', 'CRITICAL')),
    actor_user_id TEXT,
    actor_name_snapshot TEXT,
    actor_role_snapshot TEXT,
    device_id TEXT,
    device_name_snapshot TEXT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_label TEXT,
    summary TEXT NOT NULL,
    metadata_json TEXT,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    correlation_id TEXT,
    ip_or_source TEXT,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT,
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);

-- Immutability Triggers (Append-Only Guard)
CREATE TRIGGER IF NOT EXISTS trg_audit_events_no_update
BEFORE UPDATE ON audit_events
BEGIN
    SELECT RAISE(ABORT, 'audit_events are append-only and cannot be updated');
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_events_no_delete
BEFORE DELETE ON audit_events
BEGIN
    SELECT RAISE(ABORT, 'audit_events are append-only and cannot be deleted');
END;

-- Performance & Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_audit_biz_occurred 
ON audit_events(business_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_biz_cat_occurred 
ON audit_events(business_id, event_category, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_biz_type_occurred 
ON audit_events(business_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_biz_actor_occurred 
ON audit_events(business_id, actor_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_biz_entity 
ON audit_events(business_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_biz_correlation 
ON audit_events(business_id, correlation_id) 
WHERE correlation_id IS NOT NULL;
