-- Phase 4: platform-level super admin (spans all organizations).
-- Separate from per-org owner/admin — a distinct credential/session
-- system so there's no risk of an org owner ever seeing across orgs.

CREATE TABLE IF NOT EXISTS platform_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  platform_admin_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (platform_admin_id) REFERENCES platform_admins(id)
);

ALTER TABLE organizations ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE organizations ADD COLUMN cancelled_at DATETIME;

-- Bootstrap account. Password reported to the owner out-of-band, not
-- recoverable from this file (PBKDF2-SHA256, 100000 iterations).
INSERT OR IGNORE INTO platform_admins (email, password_hash)
VALUES ('nonba30@gmail.com', '36be912a733e00546ad825c90e4cc5e4:80c25261770c3832a48426a07925090107de1df5e96faae9c3807ec75c20f142');
