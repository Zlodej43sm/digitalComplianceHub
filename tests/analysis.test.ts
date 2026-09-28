import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { processAnalysis, dispatchOutbox } from '../src/api/analysis.ts';
import { fixturePolicy } from '../src/api/fixture-policy.ts';
import type { Database, Statement } from '../src/api/types.ts';

function setup() {
  const sql = new DatabaseSync(':memory:');
  for (const f of [
    'migrations/0001_identity.sql',
    'migrations/0002_cases_documents.sql',
    'migrations/0003_review_workflow.sql',
    'migrations/0004_simulated_analysis.sql',
    'seeds/local.sql',
  ])
    sql.exec(readFileSync(f, 'utf8'));
  const DB: Database = {
    prepare(q) {
      let v: (string | number | null)[] = [];
      const x = sql.prepare(q);
      const s: Statement = {
        bind(...a) {
          v = a;
          return s;
        },
        async first<T>() {
          return (x.get(...v) as T | undefined) ?? null;
        },
        async all<T>() {
          return { results: x.all(...v) as T[] };
        },
        async run() {
          return x.run(...v);
        },
      };
      return s;
    },
  };
  sql.exec(
    `INSERT INTO cases(id,bank_id,organization_id,title,description,currency,amount_minor,status,revision,created_by,created_at,updated_at) VALUES ('c','bank-demo','org-northstar','Analysis','', 'EUR',1200000,'Submitted',1,'client-northstar','2026-01-01','2026-01-01'); INSERT INTO documents VALUES ('contract','c','contract','contract.pdf','2026-01-01'),('invoice','c','invoice','invoice-v1.pdf','2026-01-01');`,
  );
  const insert = sql.prepare(
    'INSERT INTO document_versions VALUES (?,?,?,?,?,?,?,?,?,?)',
  );
  insert.run(
    'contract-v1',
    'contract',
    'c',
    1,
    'k1',
    fixturePolicy['contract.pdf'].sha256,
    1,
    'application/pdf',
    'client-northstar',
    '2026-01-01',
  );
  insert.run(
    'invoice-v1',
    'invoice',
    'c',
    1,
    'k2',
    fixturePolicy['invoice-v1.pdf'].sha256,
    1,
    'application/pdf',
    'client-northstar',
    '2026-01-01',
  );
  insert.run(
    'invoice-v2',
    'invoice',
    'c',
    2,
    'k3',
    fixturePolicy['invoice-v2.pdf'].sha256,
    1,
    'application/pdf',
    'client-northstar',
    '2026-01-02',
  );
  return { sql, DB };
}
test('simulated analysis is idempotent and a late v1 job uses current v2 comparison without overwriting it', async () => {
  const { sql, DB } = setup();
  try {
    sql
      .prepare(
        "INSERT INTO analysis_jobs VALUES ('j','c','invoice-v1','bank-demo','org-northstar','queued',0,NULL,'manager','2026','2026')",
      )
      .run();
    const msg = {
      jobId: 'j',
      caseId: 'c',
      versionId: 'invoice-v1',
      bankId: 'bank-demo',
      organizationId: 'org-northstar',
    };
    await processAnalysis({ DB }, msg);
    await processAnalysis({ DB }, msg);
    assert.equal(
      (sql.prepare('SELECT COUNT(*) count FROM analysis_results').get() as any)
        .count,
      1,
    );
    const result: any = sql.prepare('SELECT * FROM analysis_results').get();
    assert.equal(JSON.parse(result.findings).length, 0);
    assert.ok(
      JSON.parse(result.extracted_fields).some(
        (x: any) => x.amountMinor === 1200000,
      ),
    );
    assert.equal(
      (
        sql
          .prepare(
            "SELECT CASE WHEN v.version=(SELECT MAX(v2.version) FROM document_versions v2 WHERE v2.document_id=v.document_id) THEN 0 ELSE 1 END historical FROM document_versions v WHERE id='invoice-v1'",
          )
          .get() as any
      ).historical,
      1,
    );
  } finally {
    sql.close();
  }
});
test('outbox publication failure is visible and retryable without document content', async () => {
  const { sql, DB } = setup();
  try {
    sql
      .prepare(
        "INSERT INTO analysis_jobs VALUES ('j','c','invoice-v2','bank-demo','org-northstar','queued',0,NULL,'manager','2026','2026')",
      )
      .run();
    sql
      .prepare(
        "INSERT INTO analysis_outbox VALUES ('o','j','pending',0,'2000',NULL,'2026')",
      )
      .run();
    let body: any;
    const sent = await dispatchOutbox({
      DB,
      ANALYSIS_QUEUE: {
        async send(message) {
          body = message;
        },
      },
    });
    assert.equal(sent, 1);
    assert.deepEqual(Object.keys(body).sort(), [
      'bankId',
      'caseId',
      'jobId',
      'organizationId',
      'versionId',
    ]);
    assert.equal(
      (
        sql
          .prepare("SELECT status FROM analysis_outbox WHERE id='o'")
          .get() as any
      ).status,
      'published',
    );
    sql.prepare("UPDATE analysis_outbox SET status='pending',attempts=0").run();
    await dispatchOutbox({
      DB,
      ANALYSIS_QUEUE: {
        async send() {
          throw new Error('queue unavailable');
        },
      },
    });
    const failed: any = sql
      .prepare("SELECT status,last_error FROM analysis_outbox WHERE id='o'")
      .get();
    assert.equal(failed.status, 'failed');
    assert.match(failed.last_error, /queue unavailable/);
  } finally {
    sql.close();
  }
});
