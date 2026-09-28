import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createLocalApp } from '../src/adapters/cloudflare/local-identity.ts';
import type { Database, Statement } from '../src/api/types.ts';

test('complete correction workflow keeps internal notes private and snapshots final versions', async () => {
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
  const objects = new Map<string, Uint8Array>();
  const DOCUMENTS = {
    async put(k: string, v: ArrayBuffer | Uint8Array) {
      objects.set(k, new Uint8Array(v));
    },
    async get(k: string) {
      const v = objects.get(k);
      return v ? { body: new Blob([v.buffer as ArrayBuffer]).stream() } : null;
    },
    async delete(k: string) {
      objects.delete(k);
    },
  };
  const env = { DB, DOCUMENTS };
  const app = createLocalApp(),
    origin = 'http://127.0.0.1',
    mh = {
      Origin: origin,
      'Content-Type': 'application/json',
      'X-CSRF-Protection': '1',
    };
  async function login(accountId: string) {
    const r = await app.request(
      origin + '/api/local/session',
      { method: 'POST', headers: mh, body: JSON.stringify({ accountId }) },
      env,
    );
    return r.headers.get('set-cookie')!.split(';')[0]!;
  }
  async function post(path: string, Cookie: string, body: any) {
    return app.request(
      origin + path,
      {
        method: 'POST',
        headers: { ...mh, Cookie },
        body: JSON.stringify(body),
      },
      env,
    );
  }
  try {
    const client = await login('client-northstar'),
      manager = await login('manager'),
      officer = await login('compliance');
    const created: any = await (
      await post('/api/cases', client, {
        title: 'Workflow case',
        description: 'Demo',
        currency: 'EUR',
        amountMinor: 1200000,
      })
    ).json();
    const bytes = readFileSync('fixtures/documents/invoice-v1.pdf');
    let fd = new FormData();
    fd.set('kind', 'invoice');
    fd.set(
      'file',
      new File([bytes], 'invoice-v1.pdf', { type: 'application/pdf' }),
    );
    assert.equal(
      (
        await app.request(
          origin + `/api/cases/${created.id}/documents`,
          {
            method: 'POST',
            headers: {
              Origin: origin,
              'X-CSRF-Protection': '1',
              Cookie: client,
            },
            body: fd,
          },
          env,
        )
      ).status,
      201,
    );
    assert.equal(
      (await post(`/api/cases/${created.id}/submit`, client, { revision: 1 }))
        .status,
      200,
    );
    assert.equal(
      (
        await post(`/api/cases/${created.id}/manager/start`, manager, {
          revision: 2,
        })
      ).status,
      200,
    );
    for (const item of [
      'documents-present',
      'fixtures-readable',
      'parties-checked',
      'amount-currency-checked',
      'dates-checked',
    ])
      assert.equal(
        (
          await app.request(
            origin + `/api/cases/${created.id}/manager/checklist`,
            {
              method: 'PUT',
              headers: { ...mh, Cookie: manager },
              body: JSON.stringify({ item, checked: true }),
            },
            env,
          )
        ).status,
        200,
      );
    assert.equal(
      (
        await post(`/api/cases/${created.id}/manager/forward`, manager, {
          revision: 3,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await post(`/api/cases/${created.id}/messages`, officer, {
          visibility: 'internal',
          body: '   ',
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await post(`/api/cases/${created.id}/messages`, officer, {
          visibility: 'internal',
          body: 'Invoice mismatch found',
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await post(
          `/api/cases/${created.id}/compliance/request-changes`,
          officer,
          { revision: 4, message: 'Please upload corrected invoice' },
        )
      ).status,
      200,
    );
    const clientView: any = await (
      await app.request(
        origin + `/api/cases/${created.id}`,
        { headers: { Cookie: client } },
        env,
      )
    ).json();
    assert.equal(clientView.messages.length, 1);
    assert.equal(clientView.messages[0].visibility, 'client');
    assert.ok(!JSON.stringify(clientView).includes('Invoice mismatch found'));
    assert.equal(
      (
        await app.request(
          origin + `/api/cases/${created.id}/analysis`,
          { headers: { Cookie: client } },
          env,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await post(`/api/cases/${created.id}/analysis/request`, client, {
          versionId: clientView.documents[0].version_id,
        })
      ).status,
      403,
    );
    fd = new FormData();
    fd.set('kind', 'invoice');
    fd.set(
      'file',
      new File(
        [readFileSync('fixtures/documents/invoice-v2.pdf')],
        'invoice-v2.pdf',
        { type: 'application/pdf' },
      ),
    );
    assert.equal(
      (
        await app.request(
          origin + `/api/cases/${created.id}/documents`,
          {
            method: 'POST',
            headers: {
              Origin: origin,
              'X-CSRF-Protection': '1',
              Cookie: client,
            },
            body: fd,
          },
          env,
        )
      ).status,
      201,
    );
    assert.equal(
      (sql.prepare('SELECT COUNT(*) count FROM review_checklist').get() as any)
        .count,
      0,
    );
    assert.equal(
      (await post(`/api/cases/${created.id}/submit`, client, { revision: 5 }))
        .status,
      200,
    );
    for (const item of [
      'documents-present',
      'fixtures-readable',
      'parties-checked',
      'amount-currency-checked',
      'dates-checked',
    ])
      await app.request(
        origin + `/api/cases/${created.id}/manager/checklist`,
        {
          method: 'PUT',
          headers: { ...mh, Cookie: manager },
          body: JSON.stringify({ item, checked: true }),
        },
        env,
      );
    assert.equal(
      (
        await post(`/api/cases/${created.id}/manager/forward`, manager, {
          revision: 6,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await post(`/api/cases/${created.id}/compliance/decision`, officer, {
          revision: 7,
          outcome: 'Approved',
          reason: 'Corrected documents match',
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await post(`/api/cases/${created.id}/compliance/decision`, officer, {
          revision: 7,
          outcome: 'Rejected',
          reason: 'conflict',
        })
      ).status,
      409,
    );
    const decision: any = sql.prepare('SELECT * FROM review_decisions').get();
    assert.equal(decision.outcome, 'Approved');
    assert.ok(decision.document_snapshot.includes('"version":2'));
    assert.equal(
      (
        await post(`/api/cases/${created.id}/compliance/decision`, manager, {
          revision: 8,
          outcome: 'Rejected',
          reason: 'forbidden',
        })
      ).status,
      403,
    );
  } finally {
    sql.close();
  }
});
