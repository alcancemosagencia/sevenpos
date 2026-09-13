-- SevenPOS Operational Users & RBAC Migration (0010_operational_users_rbac.sql)
-- Extends users table with cloud link and last login timestamp

ALTER TABLE users ADD COLUMN cloud_user_id TEXT;
ALTER TABLE users ADD COLUMN last_login_at TEXT;

-- Multi-user lookup & uniqueness index
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_business_cloud_user 
ON users(business_id, cloud_user_id) 
WHERE cloud_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_business_active 
ON users(business_id, active);
