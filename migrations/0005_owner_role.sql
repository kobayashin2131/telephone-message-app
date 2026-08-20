-- Phase 3: owner/admin/user role hierarchy.
-- No schema change needed (users.role is a free-text column already).
-- Data-only: designate the org's first admin as its owner, so someone
-- can immediately use the new owner-only actions (granting other
-- owners, etc). Additive/idempotent — safe to re-run.

UPDATE users
SET role = 'owner'
WHERE organization_id = 1
  AND role = 'admin'
  AND id = (SELECT MIN(id) FROM users WHERE organization_id = 1 AND role = 'admin');
