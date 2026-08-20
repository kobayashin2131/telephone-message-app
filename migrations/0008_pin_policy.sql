-- Forced PIN change for admin-issued PINs (new accounts, PIN resets).
-- Owner-chosen PINs (set by the person themselves at signup or via
-- self-service change) are never forced. Additive-only, defaults to 0
-- so existing accounts are unaffected.

ALTER TABLE users ADD COLUMN must_change_pin INTEGER DEFAULT 0;
