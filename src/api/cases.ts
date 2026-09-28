import type { Hono } from 'hono';
import type { AppEnv } from './types.ts';
import { canReadOrganization } from './authorization.ts';
import { fixturePolicy } from './fixture-policy.ts';
import { processAnalysis } from './analysis.ts';

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
function org(c: any) {
  const s = c.get('session');
  return s.role === 'client' && s.organizations.length === 1
    ? s.organizations[0].id
    : null;
}
export function mountCases(app: Hono<AppEnv>) {
  app.get('/api/cases', async (c) => {
    const s = c.get('session');
    if (s.role === 'demo-admin')
      return c.json({ error: 'Business access denied' }, 403);
    const ids = s.organizations.map((x) => x.id);
    if (!ids.length) return c.json({ cases: [] });
    const qs = ids.map(() => '?').join(',');
    return c.json({
      cases: (
        await c.env.DB.prepare(
          `SELECT c.*,COALESCE(c.workflow_status,c.status) AS status FROM cases c WHERE bank_id=? AND organization_id IN (${qs}) ORDER BY updated_at DESC`,
        )
          .bind(s.bankId, ...ids)
          .all()
      ).results,
    });
  });
  app.get('/api/notifications', async (c) => {
    const s = c.get('session');
    return c.json({
      notifications: (
        await c.env.DB.prepare(
          'SELECT id,case_id,message,created_at,read_at FROM notifications WHERE user_id=? ORDER BY created_at DESC',
        )
          .bind(s.userId)
          .all()
      ).results,
    });
  });
  app.post('/api/cases', async (c) => {
    const s = c.get('session'),
      oid = org(c);
    if (!oid) return c.json({ error: 'Client access required' }, 403);
    const b: any = await c.req.json().catch(() => null);
    if (
      !b ||
      typeof b.title !== 'string' ||
      b.title.trim().length < 3 ||
      !['EUR', 'USD', 'UAH'].includes(b.currency) ||
      !Number.isSafeInteger(b.amountMinor) ||
      b.amountMinor <= 0
    )
      return c.json({ error: 'Invalid case fields' }, 400);
    const cid = id('case'),
      t = now();
    await c.env.DB.prepare(
      "INSERT INTO cases(id,bank_id,organization_id,title,description,currency,amount_minor,status,revision,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'Draft',1,?,?,?)",
    )
      .bind(
        cid,
        s.bankId,
        oid,
        b.title.trim(),
        String(b.description ?? '').slice(0, 1000),
        b.currency,
        b.amountMinor,
        s.userId,
        t,
        t,
      )
      .run();
    await c.env.DB.prepare('INSERT INTO case_audit VALUES (?,?,?,?,?,?)')
      .bind(id('audit'), cid, s.userId, 'case.created', 'revision:1', t)
      .run();
    return c.json({ id: cid, revision: 1 }, 201);
  });
  app.get('/api/cases/:id', async (c) => {
    const s = c.get('session');
    const row: any = await c.env.DB.prepare(
      'SELECT c.*,COALESCE(c.workflow_status,c.status) AS status FROM cases c WHERE id=? AND bank_id=?',
    )
      .bind(c.req.param('id'), s.bankId)
      .first();
    if (!row || !canReadOrganization(s, s.bankId, row.organization_id))
      return c.json({ error: 'Not found' }, 404);
    const documents = (
      await c.env.DB.prepare(
        'SELECT d.*,v.id version_id,v.version,v.size_bytes,v.uploaded_at FROM documents d LEFT JOIN document_versions v ON v.document_id=d.id WHERE d.case_id=? ORDER BY d.created_at,v.version',
      )
        .bind(row.id)
        .all()
    ).results;
    const audit = (
      await c.env.DB.prepare(
        'SELECT action,detail,created_at FROM case_audit WHERE case_id=? ORDER BY created_at',
      )
        .bind(row.id)
        .all()
    ).results;
    const messages = (
      await c.env.DB.prepare(
        `SELECT m.id,m.visibility,m.kind,m.body,m.created_at,u.display_name author FROM case_messages m JOIN users u ON u.id=m.author_id WHERE m.case_id=? ${s.role === 'client' ? "AND m.visibility='client'" : ''} ORDER BY m.created_at`,
      )
        .bind(row.id)
        .all()
    ).results;
    const checklist =
      s.role === 'client'
        ? []
        : (
            await c.env.DB.prepare(
              'SELECT item,checked,updated_at FROM review_checklist WHERE case_id=? ORDER BY item',
            )
              .bind(row.id)
              .all()
          ).results;
    const decision = await c.env.DB.prepare(
      'SELECT outcome,reason,document_snapshot,created_at FROM review_decisions WHERE case_id=?',
    )
      .bind(row.id)
      .first();
    return c.json({
      case: row,
      documents,
      audit,
      messages,
      checklist,
      decision,
    });
  });
  app.post('/api/cases/:id/submit', async (c) => {
    const s = c.get('session'),
      oid = org(c),
      b: any = await c.req.json().catch(() => null);
    if (!oid || !Number.isInteger(b?.revision))
      return c.json({ error: 'Invalid request' }, 400);
    const row: any = await c.env.DB.prepare(
      'SELECT * FROM cases WHERE id=? AND bank_id=? AND organization_id=?',
    )
      .bind(c.req.param('id'), s.bankId, oid)
      .first();
    if (!row) return c.json({ error: 'Not found' }, 404);
    const effective = row.workflow_status ?? row.status;
    if (effective === 'Submitted' || effective === 'ManagerReview')
      return c.json({ id: row.id, status: row.status, revision: row.revision });
    if (effective !== 'Draft' && effective !== 'AwaitingClient')
      return c.json({ error: 'Case cannot be submitted' }, 409);
    if (row.revision !== b.revision)
      return c.json({ error: 'Revision conflict' }, 409);
    const count: any = await c.env.DB.prepare(
      'SELECT COUNT(*) count FROM document_versions WHERE case_id=?',
    )
      .bind(row.id)
      .first();
    if (!count?.count)
      return c.json({ error: 'Upload at least one document' }, 400);
    const t = now();
    const next = effective === 'AwaitingClient' ? 'ManagerReview' : 'Submitted';
    await c.env.DB.prepare(
      "UPDATE cases SET status='Submitted',workflow_status=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
    )
      .bind(next, t, row.id, b.revision)
      .run();
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO case_audit VALUES (?,?,?,?,?,?)',
    )
      .bind(
        id('audit'),
        row.id,
        s.userId,
        'case.submitted',
        `revision:${b.revision + 1}`,
        t,
      )
      .run();
    return c.json({
      id: row.id,
      status: next,
      revision: b.revision + 1,
    });
  });
  app.post('/api/cases/:id/client-response', async (c) => {
    const s = c.get('session'),
      oid = org(c),
      b: any = await c.req.json().catch(() => null);
    if (!oid || typeof b?.body !== 'string' || b.body.trim().length < 1)
      return c.json({ error: 'Invalid response' }, 400);
    const row: any = await c.env.DB.prepare(
      'SELECT id,COALESCE(workflow_status,status) effective_status FROM cases WHERE id=? AND bank_id=? AND organization_id=?',
    )
      .bind(c.req.param('id'), s.bankId, oid)
      .first();
    if (!row) return c.json({ error: 'Not found' }, 404);
    if (row.effective_status !== 'AwaitingClient')
      return c.json({ error: 'Response is not expected' }, 409);
    await c.env.DB.prepare('INSERT INTO case_messages VALUES (?,?,?,?,?,?,?)')
      .bind(
        id('msg'),
        row.id,
        s.userId,
        'client',
        'client-response',
        b.body.trim().slice(0, 2000),
        now(),
      )
      .run();
    await c.env.DB.prepare('INSERT INTO case_audit VALUES (?,?,?,?,?,?)')
      .bind(
        id('audit'),
        row.id,
        s.userId,
        'client.responded',
        'Client response added',
        now(),
      )
      .run();
    return c.json({ ok: true }, 201);
  });
  app.post('/api/cases/:id/documents', async (c) => {
    const s = c.get('session'),
      oid = org(c);
    if (!oid || !c.env.DOCUMENTS)
      return c.json({ error: 'Client storage unavailable' }, 503);
    const row: any = await c.env.DB.prepare(
      'SELECT * FROM cases WHERE id=? AND bank_id=? AND organization_id=?',
    )
      .bind(c.req.param('id'), s.bankId, oid)
      .first();
    if (!row) return c.json({ error: 'Not found' }, 404);
    if (!['Draft', 'AwaitingClient'].includes(row.status))
      return c.json({ error: 'Case is read-only' }, 409);
    const form = await c.req.formData();
    const file = form.get('file'),
      kind = form.get('kind');
    if (
      !(file instanceof File) ||
      typeof kind !== 'string' ||
      file.size > 10485760
    )
      return c.json({ error: 'Invalid file' }, 400);
    const bytes = await file.arrayBuffer();
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      (x) => x.toString(16).padStart(2, '0'),
    ).join('');
    const policy = (
      fixturePolicy as Record<
        string,
        { sha256: string; mediaType: string; kind: string }
      >
    )[file.name];
    if (
      !policy ||
      policy.sha256 !== hash ||
      policy.mediaType !== file.type ||
      policy.kind !== kind
    )
      return c.json(
        { error: 'Only supplied synthetic fixtures are accepted' },
        400,
      );
    const total: any = await c.env.DB.prepare(
      'SELECT COUNT(*) count FROM document_versions WHERE case_id=?',
    )
      .bind(row.id)
      .first();
    if (total.count >= 10)
      return c.json({ error: 'Version limit reached' }, 409);
    const existing: any = await c.env.DB.prepare(
      'SELECT id FROM documents WHERE case_id=? AND kind=?',
    )
      .bind(row.id, kind)
      .first();
    const did = existing?.id ?? id('doc');
    const v: any = await c.env.DB.prepare(
      'SELECT COALESCE(MAX(version),0)+1 next FROM document_versions WHERE document_id=?',
    )
      .bind(did)
      .first();
    const vid = id('version'),
      key = `${s.bankId}/${oid}/${row.id}/${did}/${vid}`,
      t = now();
    await c.env.DOCUMENTS.put(key, bytes);
    try {
      if (!existing)
        await c.env.DB.prepare('INSERT INTO documents VALUES (?,?,?,?,?)')
          .bind(did, row.id, kind, file.name, t)
          .run();
      await c.env.DB.prepare(
        'INSERT INTO document_versions VALUES (?,?,?,?,?,?,?,?,?,?)',
      )
        .bind(
          vid,
          did,
          row.id,
          v.next,
          key,
          hash,
          file.size,
          file.type,
          s.userId,
          t,
        )
        .run();
      const analysisJob = id('job');
      await c.env.DB.prepare(
        "INSERT INTO analysis_jobs VALUES (?,?,?,?,?,'queued',0,NULL,?,?,?)",
      )
        .bind(analysisJob, row.id, vid, s.bankId, oid, s.userId, t, t)
        .run();
      await c.env.DB.prepare(
        "INSERT INTO analysis_outbox VALUES (?,?,'pending',0,?,NULL,?)",
      )
        .bind(id('outbox'), analysisJob, t, t)
        .run();
      await c.env.DB.prepare('DELETE FROM review_checklist WHERE case_id=?')
        .bind(row.id)
        .run();
      await c.env.DB.prepare('INSERT INTO case_audit VALUES (?,?,?,?,?,?)')
        .bind(
          id('audit'),
          row.id,
          s.userId,
          'document.uploaded',
          `${kind}:v${v.next}`,
          t,
        )
        .run();
      if (!c.env.ANALYSIS_QUEUE)
        await processAnalysis(c.env, {
          jobId: analysisJob,
          caseId: row.id,
          versionId: vid,
          bankId: s.bankId,
          organizationId: oid,
        }).catch(() => {});
      return c.json({ documentId: did, versionId: vid, version: v.next }, 201);
    } catch (e) {
      await c.env.DOCUMENTS.delete(key);
      throw e;
    }
  });
  app.get('/api/cases/:caseId/documents/:versionId', async (c) => {
    const s = c.get('session');
    const row: any = await c.env.DB.prepare(
      'SELECT c.bank_id,c.organization_id,d.original_name,v.object_key,v.media_type FROM document_versions v JOIN documents d ON d.id=v.document_id JOIN cases c ON c.id=v.case_id WHERE v.id=? AND c.id=?',
    )
      .bind(c.req.param('versionId'), c.req.param('caseId'))
      .first();
    if (
      !row ||
      !canReadOrganization(s, row.bank_id, row.organization_id) ||
      !c.env.DOCUMENTS
    )
      return c.json({ error: 'Not found' }, 404);
    const object = await c.env.DOCUMENTS.get(row.object_key);
    if (!object) return c.json({ error: 'File unavailable' }, 503);
    return new Response(object.body, {
      headers: {
        'Content-Type': row.media_type,
        'Content-Disposition': `attachment; filename="${String(row.original_name).replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
        'Cache-Control': 'no-store',
      },
    });
  });
}
