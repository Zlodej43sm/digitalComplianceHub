import type { Hono } from 'hono';
import type { AppEnv, Bindings } from './types.ts';
import { extractFixture, compareFixtures } from './fixture-analysis.ts';
const now = () => new Date().toISOString(),
  id = (p: string) => `${p}_${crypto.randomUUID()}`;
export interface AnalysisMessage {
  jobId: string;
  caseId: string;
  versionId: string;
  bankId: string;
  organizationId: string;
}
export async function processAnalysis(env: Bindings, message: AnalysisMessage) {
  const job: any = await env.DB.prepare(
    'SELECT * FROM analysis_jobs WHERE id=? AND case_id=? AND version_id=? AND bank_id=? AND organization_id=?',
  )
    .bind(
      message.jobId,
      message.caseId,
      message.versionId,
      message.bankId,
      message.organizationId,
    )
    .first();
  if (!job) return;
  if (job.status === 'completed') return;
  await env.DB.prepare(
    "UPDATE analysis_jobs SET status='processing',attempts=attempts+1,error=NULL,updated_at=? WHERE id=?",
  )
    .bind(now(), job.id)
    .run();
  try {
    const versions = (
      await env.DB.prepare(
        `SELECT v.id,v.sha256,v.uploaded_at,d.kind FROM document_versions v JOIN documents d ON d.id=v.document_id WHERE v.case_id=? AND v.version=(SELECT MAX(v2.version) FROM document_versions v2 WHERE v2.document_id=v.document_id) ORDER BY d.kind`,
      )
        .bind(job.case_id)
        .all<any>()
    ).results;
    const caseRow: any = await env.DB.prepare(
      'SELECT currency,amount_minor FROM cases WHERE id=?',
    )
      .bind(job.case_id)
      .first();
    const fallbackFor = (v: any) => ({
      kind: v.kind,
      amountMinor: caseRow.amount_minor,
      currency: caseRow.currency,
      parties: ['Client organization', 'Counterparty (unverified)'],
      documentDate: String(v.uploaded_at).slice(0, 10),
      page: 1,
    });
    const fields = versions.map((v) => extractFixture(v.sha256, fallbackFor(v)));
    const result = compareFixtures(fields),
      focusVersion = versions.find((v) => v.id === job.version_id) ?? versions[0],
      focus = extractFixture(focusVersion.sha256, fallbackFor(focusVersion));
    await env.DB.prepare(
      'INSERT INTO analysis_results VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(job_id) DO NOTHING',
    )
      .bind(
        id('analysis'),
        job.id,
        job.case_id,
        job.version_id,
        JSON.stringify(fields),
        JSON.stringify(result.findings),
        result.summary,
        result.suggestedRequest,
        focus.page,
        now(),
      )
      .run();
    await env.DB.prepare(
      "UPDATE analysis_jobs SET status='completed',error=NULL,updated_at=? WHERE id=?",
    )
      .bind(now(), job.id)
      .run();
  } catch (error) {
    const current: any = await env.DB.prepare(
      'SELECT attempts FROM analysis_jobs WHERE id=?',
    )
      .bind(job.id)
      .first();
    await env.DB.prepare(
      "UPDATE analysis_jobs SET status='failed',error=?,updated_at=? WHERE id=?",
    )
      .bind(
        current?.attempts >= 3
          ? 'Retry limit reached'
          : String((error as Error).message).slice(0, 300),
        now(),
        job.id,
      )
      .run();
    throw error;
  }
}
export async function dispatchOutbox(env: Bindings) {
  if (!env.ANALYSIS_QUEUE) return 0;
  const rows = (
    await env.DB.prepare(
      "SELECT o.id outbox_id,j.id job_id,j.case_id,j.version_id,j.bank_id,j.organization_id,o.attempts FROM analysis_outbox o JOIN analysis_jobs j ON j.id=o.job_id WHERE o.status IN ('pending','failed') AND o.next_attempt_at<=? AND o.attempts<3 ORDER BY o.created_at LIMIT 25",
    )
      .bind(now())
      .all<any>()
  ).results;
  let sent = 0;
  for (const row of rows) {
    try {
      await env.ANALYSIS_QUEUE.send({
        jobId: row.job_id,
        caseId: row.case_id,
        versionId: row.version_id,
        bankId: row.bank_id,
        organizationId: row.organization_id,
      });
      await env.DB.prepare(
        "UPDATE analysis_outbox SET status='published',attempts=attempts+1,last_error=NULL WHERE id=?",
      )
        .bind(row.outbox_id)
        .run();
      sent++;
    } catch (error) {
      await env.DB.prepare(
        "UPDATE analysis_outbox SET status='failed',attempts=attempts+1,last_error=?,next_attempt_at=? WHERE id=?",
      )
        .bind(
          String((error as Error).message).slice(0, 300),
          new Date(Date.now() + 60000).toISOString(),
          row.outbox_id,
        )
        .run();
    }
  }
  return sent;
}
async function staffCase(c: any) {
  const s = c.get('session');
  if (!['manager', 'compliance'].includes(s.role)) return null;
  return c.env.DB.prepare(
    `SELECT c.* FROM cases c WHERE c.id=? AND c.bank_id=? AND EXISTS(SELECT 1 FROM staff_assignments a WHERE a.user_id=? AND a.organization_id=c.organization_id AND a.bank_id=c.bank_id)`,
  )
    .bind(c.req.param('id'), s.bankId, s.userId)
    .first();
}
export function mountAnalysis(app: Hono<AppEnv>) {
  app.get('/api/cases/:id/analysis', async (c) => {
    const row = await staffCase(c);
    if (!row) return c.json({ error: 'Not found' }, 404);
    const results = (
      await c.env.DB.prepare(
        `SELECT j.id job_id,j.version_id,j.status,j.attempts,j.error,r.extracted_fields,r.findings,r.summary,r.suggested_request,r.source_page,r.completed_at,CASE WHEN v.version=(SELECT MAX(v2.version) FROM document_versions v2 WHERE v2.document_id=v.document_id) THEN 0 ELSE 1 END historical FROM analysis_jobs j JOIN document_versions v ON v.id=j.version_id LEFT JOIN analysis_results r ON r.job_id=j.id WHERE j.case_id=? ORDER BY j.created_at`,
      )
        .bind(row.id)
        .all()
    ).results;
    return c.json({ label: 'Simulated analysis', runs: results });
  });
  app.post('/api/cases/:id/analysis/request', async (c) => {
    const s = c.get('session'),
      row = await staffCase(c),
      b: any = await c.req.json().catch(() => null);
    if (!row || typeof b?.versionId !== 'string')
      return c.json({ error: 'Forbidden' }, 403);
    const version: any = await c.env.DB.prepare(
      'SELECT id FROM document_versions WHERE id=? AND case_id=?',
    )
      .bind(b.versionId, row.id)
      .first();
    if (!version) return c.json({ error: 'Version not found' }, 404);
    const existing: any = await c.env.DB.prepare(
      'SELECT id,status FROM analysis_jobs WHERE version_id=?',
    )
      .bind(version.id)
      .first();
    if (existing) {
      if (!c.env.ANALYSIS_QUEUE && existing.status === 'queued')
        await processAnalysis(c.env, {
          jobId: existing.id,
          caseId: row.id,
          versionId: version.id,
          bankId: row.bank_id,
          organizationId: row.organization_id,
        }).catch(() => {});
      return c.json({ jobId: existing.id, status: existing.status });
    }
    const job = id('job'),
      t = now();
    await c.env.DB.prepare(
      "INSERT INTO analysis_jobs VALUES (?,?,?,?,?,'queued',0,NULL,?,?,?)",
    )
      .bind(
        job,
        row.id,
        version.id,
        row.bank_id,
        row.organization_id,
        s.userId,
        t,
        t,
      )
      .run();
    await c.env.DB.prepare(
      "INSERT INTO analysis_outbox VALUES (?,?,'pending',0,?,NULL,?)",
    )
      .bind(id('outbox'), job, t, t)
      .run();
    if (!c.env.ANALYSIS_QUEUE)
      await processAnalysis(c.env, {
        jobId: job,
        caseId: row.id,
        versionId: version.id,
        bankId: row.bank_id,
        organizationId: row.organization_id,
      }).catch(() => {});
    return c.json(
      { jobId: job, status: c.env.ANALYSIS_QUEUE ? 'queued' : 'completed' },
      202,
    );
  });
  app.post('/api/cases/:id/analysis/:jobId/retry', async (c) => {
    const row = await staffCase(c);
    if (!row) return c.json({ error: 'Forbidden' }, 403);
    const job: any = await c.env.DB.prepare(
      "SELECT * FROM analysis_jobs WHERE id=? AND case_id=? AND status='failed' AND attempts<3",
    )
      .bind(c.req.param('jobId'), row.id)
      .first();
    if (!job) return c.json({ error: 'Job cannot be retried' }, 409);
    await c.env.DB.prepare(
      "UPDATE analysis_jobs SET status='queued',error=NULL,updated_at=? WHERE id=?",
    )
      .bind(now(), job.id)
      .run();
    await c.env.DB.prepare(
      "UPDATE analysis_outbox SET status='pending',next_attempt_at=?,last_error=NULL WHERE job_id=?",
    )
      .bind(now(), job.id)
      .run();
    if (!c.env.ANALYSIS_QUEUE)
      await processAnalysis(c.env, {
        jobId: job.id,
        caseId: job.case_id,
        versionId: job.version_id,
        bankId: job.bank_id,
        organizationId: job.organization_id,
      }).catch(() => {});
    return c.json({ status: 'queued' });
  });
}
