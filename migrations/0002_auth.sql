-- Phase 2: authentication foundation. Additive-only.
-- Adds session storage and a PBKDF2 password_hash column for ID+PIN login.
-- The old plaintext `password` column is left untouched/unused (never was
-- used for real login — there was no login screen before this).

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Bootstrap PINs for the 6 existing seed users (org 1).
-- Format is "<salt-hex>:<pbkdf2-hash-hex>", PBKDF2-SHA256, 100000 iterations.
-- Plaintext PINs were reported to the owner out-of-band and are not
-- recoverable from this file.
UPDATE users SET password_hash = 'ab0d06d74c0979c18407597255eb4275:9cb2ba9087a9b23fca38f5f089f061d7f4430e764e9292e459b2c896b673e4fd' WHERE id = 1;
UPDATE users SET password_hash = '8221ad26c1e037257c556632507d2e1f:09b6828b684758f5a6f71dbb50a5d81977281fee16ec538f259254522a7b0ce0' WHERE id = 2;
UPDATE users SET password_hash = '16b02eb0da04b42450b9019be3b1a358:ed76f813e21beb00d8edf35afa372030f3dec87d896af8c47182e5206626b4fb' WHERE id = 3;
UPDATE users SET password_hash = '9c33c619be4e0d1dd0fd7e6cba908aa3:e77815a6633630f01fe419df42bd28479e4b0050674fb0b98ead67ff3df7a886' WHERE id = 4;
UPDATE users SET password_hash = '3c22aadb4640727fcb782da1128c499b:eff252509b33367d384d96d1c1f24f014975f931635b0c9bb367200e1c8473a8' WHERE id = 5;
UPDATE users SET password_hash = 'a2ba844b5dbfd732c2ceea86017533dd:f5a073cd8f8311641e69865335b60a59267f1ef71af6bb299824930912bcc496' WHERE id = 6;
