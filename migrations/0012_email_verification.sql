-- Owner signup emails were never actually confirmed to be real/owned —
-- only format-validated. Adds a lightweight, non-blocking verification
-- flow: a token is generated at signup and emailed via Resend; clicking
-- the link sets email_verified_at. Login/account access is NOT gated on
-- this (avoids onboarding friction) — it exists so the contact address
-- used for future billing/plan communications is known to be reachable.

ALTER TABLE users ADD COLUMN email_verified_at DATETIME;
ALTER TABLE users ADD COLUMN email_verification_token TEXT;
