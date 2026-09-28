PRAGMA foreign_keys = ON;
CREATE TABLE banks (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE organizations (
  id TEXT PRIMARY KEY, bank_id TEXT NOT NULL REFERENCES banks(id), name TEXT NOT NULL,
  UNIQUE(bank_id, id)
);
CREATE TABLE users (
  id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject TEXT NOT NULL,
  display_name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  UNIQUE(issuer, subject)
);
-- One effective membership per identity for this POC; no implicit role union.
CREATE TABLE memberships (
  user_id TEXT PRIMARY KEY REFERENCES users(id), bank_id TEXT NOT NULL REFERENCES banks(id),
  role TEXT NOT NULL CHECK(role IN ('client','manager','compliance','demo-admin')),
  organization_id TEXT,
  CHECK((role = 'client' AND organization_id IS NOT NULL) OR (role <> 'client' AND organization_id IS NULL)),
  FOREIGN KEY(bank_id, organization_id) REFERENCES organizations(bank_id, id),
  UNIQUE(user_id, bank_id)
);
CREATE TABLE staff_assignments (
  user_id TEXT NOT NULL, bank_id TEXT NOT NULL, organization_id TEXT NOT NULL,
  PRIMARY KEY(user_id, organization_id),
  FOREIGN KEY(user_id, bank_id) REFERENCES memberships(user_id, bank_id),
  FOREIGN KEY(bank_id, organization_id) REFERENCES organizations(bank_id, id)
);
-- Used only by the development entry point. No hosted code accepts these tokens.
CREATE TABLE local_sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
);
CREATE INDEX local_sessions_expiry ON local_sessions(expires_at);
