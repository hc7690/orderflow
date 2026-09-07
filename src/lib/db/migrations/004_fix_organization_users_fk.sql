-- OrderFlow - Migration 004
-- Fix FK organization_users yang masih menunjuk ke users_backup

PRAGMA foreign_keys = OFF;

ALTER TABLE organization_users RENAME TO organization_users_backup;

CREATE TABLE organization_users (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(organization_id, user_id)
);

INSERT INTO organization_users (
    id, organization_id, user_id, role, created_at
)
SELECT
    id, organization_id, user_id, role, created_at
FROM organization_users_backup;

DROP TABLE organization_users_backup;

CREATE INDEX IF NOT EXISTS idx_organization_users_org
ON organization_users(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_users_user
ON organization_users(user_id);

CREATE INDEX IF NOT EXISTS idx_organization_users_role
ON organization_users(organization_id, role);

PRAGMA foreign_keys = ON;
