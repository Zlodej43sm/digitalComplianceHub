import type { Hono } from 'hono';
import type { AppEnv } from './types.ts';

const items = [
  'documents-present',
  'fixtures-readable',
  'parties-checked',
  'amount-currency-checked',
  'dates-checked',
];
const now = () => new Date().toISOString();
const id = (p: string) => `${p}_${crypto.randomUUID()}`;
async function scoped(c: any) {
  const s = c.get('session');
  return c.env.DB.prepare(
    `SELECT c.*,COALESCE(c.workflow_status,c.status) effective_status FROM cases c WHERE c.id=? AND c.bank_id=? AND EXISTS(SELECT 1 FROM staff_assignments a WHERE a.user_id=? AND a.bank_id=c.bank_id AND a.organization_id=c.organization_id)`,
  )
    .bind(c.req.param('id'), s.bankId, s.userId)
    .first();
}
async function snapshot(c: any, caseId: string) {
  const rows = (
    await c.env.DB.prepare(
      'SELECT document_id,id,version,sha256 FROM document_versions WHERE case_id=? ORDER BY document_id,version',
    )
      .bind(caseId)
      .all()
  ).results;
  return JSON.stringify(rows);
}
async function audit(c: any, caseId: string, action: string, detail: string) {
  const s = c.get('session');
  await c.env.DB.prepare('INSERT INTO case_audit VALUES (?,?,?,?,?,?)')
    .bind(id('audit'), caseId, s.userId, action, detail, now())
    .run();
}
export function mountWorkflow(app: Hono<AppEnv>) {
  app.post('/api/cases/:id/manager/start', async (c) => {
    const s = c.get('session');
    if (s.role !== 'manager')
      return c.json({ error: 'Manager access required' }, 403);
    const row = await scoped(c);
    if (!row) return c.json({ error: 'Not found' }, 404);
    if (row.effective_status === 'ManagerReview')
      return c.json({ status: 'ManagerReview', revision: row.revision });
    if (row.effective_status !== 'Submitted')
      return c.json({ error: 'Invalid transition' }, 409);
    const b: any = await c.req.json().catch(() => null);
    if (b?.revision !== row.revision)
      return c.json({ error: 'Revision conflict' }, 409);
    await c.env.DB.prepare(
      "UPDATE cases SET workflow_status='ManagerReview',assigned_manager_id=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
    )
      .bind(s.userId, now(), row.id, row.revision)
      .run();
    await audit(
      c,
      row.id,
      'manager.review-started',
      `revision:${row.revision + 1}`,
    );
    return c.json({ status: 'ManagerReview', revision: row.revision + 1 });
  });
  app.put('/api/cases/:id/manager/checklist', async (c) => {
    const s = c.get('session'),
      row = await scoped(c),
      b: any = await c.req.json().catch(() => null);
    if (s.role !== 'manager' || !row || row.assigned_manager_id !== s.userId)
      return c.json({ error: 'Forbidden' }, 403);
    if (
      row.effective_status !== 'ManagerReview' ||
      !items.includes(b?.item) ||
      typeof b.checked !== 'boolean'
    )
      return c.json({ error: 'Invalid checklist update' }, 409);
    const snap = await snapshot(c, row.id);
    await c.env.DB.prepare(
      'INSERT INTO review_checklist VALUES (?,?,?,?,?,?) ON CONFLICT(case_id,item) DO UPDATE SET checked=excluded.checked,snapshot=excluded.snapshot,checked_by=excluded.checked_by,updated_at=excluded.updated_at',
    )
      .bind(row.id, b.item, b.checked ? 1 : 0, snap, s.userId, now())
      .run();
    return c.json({ ok: true });
  });
  app.post('/api/cases/:id/manager/request-changes', async (c) =>
    change(c, 'manager'),
  );
  app.post('/api/cases/:id/compliance/request-changes', async (c) =>
    change(c, 'compliance'),
  );
  async function change(c: any, role: string) {
    const s = c.get('session'),
      row = await scoped(c),
      b: any = await c.req.json().catch(() => null);
    if (
      s.role !== role ||
      !row ||
      typeof b?.message !== 'string' ||
      b.message.trim().length < 3
    )
      return c.json({ error: 'Forbidden or invalid request' }, 403);
    const expected = role === 'manager' ? 'ManagerReview' : 'ComplianceReview';
    if (row.effective_status !== expected || b.revision !== row.revision)
      return c.json({ error: 'Revision conflict or invalid transition' }, 409);
    if (
      (role === 'manager' && row.assigned_manager_id !== s.userId) ||
      (role === 'compliance' && row.assigned_officer_id !== s.userId)
    )
      return c.json({ error: 'Not assigned' }, 403);
    const t = now();
    await c.env.DB.prepare(
      "UPDATE cases SET workflow_status='AwaitingClient',status='AwaitingClient',revision=revision+1,updated_at=? WHERE id=? AND revision=?",
    )
      .bind(t, row.id, row.revision)
      .run();
    await c.env.DB.prepare('INSERT INTO case_messages VALUES (?,?,?,?,?,?,?)')
      .bind(
        id('msg'),
        row.id,
        s.userId,
        'client',
        'change-request',
        b.message.trim(),
        t,
      )
      .run();
    await c.env.DB.prepare(
      'INSERT INTO notifications SELECT ?,created_by,id,?,?,NULL FROM cases WHERE id=?',
    )
      .bind(id('notice'), 'Changes requested', t, row.id)
      .run();
    await audit(c, row.id, `${role}.changes-requested`, b.message.trim());
    return c.json({ status: 'AwaitingClient', revision: row.revision + 1 });
  }
  app.post('/api/cases/:id/manager/forward', async (c) => {
    const s = c.get('session'),
      row = await scoped(c),
      b: any = await c.req.json().catch(() => null);
    if (s.role !== 'manager' || !row || row.assigned_manager_id !== s.userId)
      return c.json({ error: 'Forbidden' }, 403);
    if (
      row.effective_status !== 'ManagerReview' ||
      b?.revision !== row.revision
    )
      return c.json({ error: 'Revision conflict or invalid transition' }, 409);
    const snap = await snapshot(c, row.id);
    const count: any = await c.env.DB.prepare(
      'SELECT COUNT(*) count FROM review_checklist WHERE case_id=? AND checked=1 AND snapshot=?',
    )
      .bind(row.id, snap)
      .first();
    if (count?.count !== items.length)
      return c.json(
        { error: 'Complete checklist for current document versions' },
        409,
      );
    const officer: any = await c.env.DB.prepare(
      "SELECT a.user_id FROM staff_assignments a JOIN memberships m ON m.user_id=a.user_id WHERE a.organization_id=? AND m.role='compliance' LIMIT 1",
    )
      .bind(row.organization_id)
      .first();
    if (!officer)
      return c.json({ error: 'No compliance officer assigned' }, 409);
    await c.env.DB.prepare(
      "UPDATE cases SET workflow_status='ComplianceReview',assigned_officer_id=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
    )
      .bind(officer.user_id, now(), row.id, row.revision)
      .run();
    await audit(
      c,
      row.id,
      'manager.forwarded',
      `officer:${officer.user_id};revision:${row.revision + 1}`,
    );
    return c.json({ status: 'ComplianceReview', revision: row.revision + 1 });
  });
  app.post('/api/cases/:id/messages', async (c) => {
    const s = c.get('session'),
      row = await scoped(c),
      b: any = await c.req.json().catch(() => null);
    if (!['manager', 'compliance'].includes(s.role) || !row)
      return c.json({ error: 'Forbidden' }, 403);
    const message = typeof b?.body === 'string' ? b.body.trim() : '';
    if (
      message.length < 1 ||
      message.length > 2000 ||
      !['internal', 'client'].includes(b?.visibility)
    )
      return c.json({ error: 'Invalid message' }, 400);
    await c.env.DB.prepare('INSERT INTO case_messages VALUES (?,?,?,?,?,?,?)')
      .bind(
        id('msg'),
        row.id,
        s.userId,
        b.visibility,
        'note',
        message,
        now(),
      )
      .run();
    return c.json({ ok: true }, 201);
  });
  app.post('/api/cases/:id/compliance/decision', async (c) => {
    const s = c.get('session'),
      row = await scoped(c),
      b: any = await c.req.json().catch(() => null);
    if (s.role !== 'compliance' || !row || row.assigned_officer_id !== s.userId)
      return c.json({ error: 'Forbidden' }, 403);
    if (
      row.effective_status !== 'ComplianceReview' ||
      b?.revision !== row.revision ||
      !['Approved', 'Rejected'].includes(b?.outcome) ||
      typeof b.reason !== 'string' ||
      b.reason.trim().length < 3
    )
      return c.json({ error: 'Invalid decision' }, 409);
    const snap = await snapshot(c, row.id),
      t = now();
    await c.env.DB.prepare(
      'INSERT INTO review_decisions VALUES (?,?,?,?,?,?,?)',
    )
      .bind(
        id('decision'),
        row.id,
        s.userId,
        b.outcome,
        b.reason.trim(),
        snap,
        t,
      )
      .run();
    await c.env.DB.prepare(
      'UPDATE cases SET workflow_status=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?',
    )
      .bind(b.outcome, t, row.id, row.revision)
      .run();
    await audit(
      c,
      row.id,
      `compliance.${String(b.outcome).toLowerCase()}`,
      b.reason.trim(),
    );
    return c.json({ status: b.outcome, revision: row.revision + 1 });
  });
}
