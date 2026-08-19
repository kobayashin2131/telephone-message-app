-- Phase 1: multi-tenant foundation. Additive-only (no DROP), safe to run
-- against the existing production database — existing rows become
-- organization_id = 1 ("デフォルト組織" = this owner's own company).

CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO organizations (id, name) VALUES (1, 'デフォルト組織');

ALTER TABLE departments ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE chat_groups ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE call_memos ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE caller_contacts ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE push_subscriptions ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;
