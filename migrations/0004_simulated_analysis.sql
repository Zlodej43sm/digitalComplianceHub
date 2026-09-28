CREATE TABLE analysis_jobs (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), version_id TEXT NOT NULL REFERENCES document_versions(id),
  bank_id TEXT NOT NULL, organization_id TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('queued','processing','completed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0, error TEXT, requested_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  UNIQUE(version_id)
);
CREATE TABLE analysis_results (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL UNIQUE REFERENCES analysis_jobs(id), case_id TEXT NOT NULL REFERENCES cases(id),
  version_id TEXT NOT NULL REFERENCES document_versions(id), extracted_fields TEXT NOT NULL, findings TEXT NOT NULL,
  summary TEXT NOT NULL, suggested_request TEXT NOT NULL, source_page INTEGER NOT NULL, completed_at TEXT NOT NULL
);
CREATE TABLE analysis_outbox (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL UNIQUE REFERENCES analysis_jobs(id), status TEXT NOT NULL CHECK(status IN ('pending','published','failed')),
  attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, last_error TEXT, created_at TEXT NOT NULL
);
CREATE INDEX analysis_jobs_case ON analysis_jobs(case_id,created_at);
CREATE INDEX analysis_outbox_pending ON analysis_outbox(status,next_attempt_at);
