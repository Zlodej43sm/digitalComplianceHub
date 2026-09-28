ALTER TABLE cases ADD COLUMN workflow_status TEXT;
ALTER TABLE cases ADD COLUMN assigned_manager_id TEXT REFERENCES users(id);
ALTER TABLE cases ADD COLUMN assigned_officer_id TEXT REFERENCES users(id);
CREATE TABLE review_checklist (
  case_id TEXT NOT NULL REFERENCES cases(id), item TEXT NOT NULL,
  checked INTEGER NOT NULL CHECK(checked IN (0,1)), snapshot TEXT NOT NULL,
  checked_by TEXT NOT NULL REFERENCES users(id), updated_at TEXT NOT NULL,
  PRIMARY KEY(case_id,item)
);
CREATE TABLE case_messages (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id),
  author_id TEXT NOT NULL REFERENCES users(id), visibility TEXT NOT NULL CHECK(visibility IN ('internal','client')),
  kind TEXT NOT NULL CHECK(kind IN ('note','change-request','client-response')),
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 2000), created_at TEXT NOT NULL
);
CREATE TABLE review_decisions (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL UNIQUE REFERENCES cases(id),
  officer_id TEXT NOT NULL REFERENCES users(id), outcome TEXT NOT NULL CHECK(outcome IN ('Approved','Rejected')),
  reason TEXT NOT NULL CHECK(length(reason) BETWEEN 3 AND 2000), document_snapshot TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE notifications (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), case_id TEXT NOT NULL REFERENCES cases(id),
  message TEXT NOT NULL, created_at TEXT NOT NULL, read_at TEXT
);
