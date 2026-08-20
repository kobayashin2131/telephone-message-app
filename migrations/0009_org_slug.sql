-- Per-organization subdomain login (e.g. {slug}.easystance.app).
-- Additive-only: nullable, existing orgs are unaffected until they opt in
-- via the new "set my org's URL" action. Does NOT change users.email
-- uniqueness — that stays global for now (see CLAUDE.md for why).

ALTER TABLE organizations ADD COLUMN slug TEXT;
CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug);
