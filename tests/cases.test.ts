import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createLocalApp } from '../src/adapters/cloudflare/local-identity.ts';
import type { Database, Statement } from '../src/api/types.ts';

test('client case creation is durable, scoped and submission requires a document', async () => {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync('migrations/0001_identity.sql', 'utf8'));
  sql.exec(readFileSync('migrations/0002_cases_documents.sql', 'utf8'));
  sql.exec(readFileSync('migrations/0003_review_workflow.sql', 'utf8'));
  sql.exec(readFileSync('migrations/0004_simulated_analysis.sql', 'utf8'));
  sql.exec(readFileSync('seeds/local.sql', 'utf8'));
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
  const env = { DB };
  const app = createLocalApp();
  const origin = 'http://127.0.0.1';
  const mh = {
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
  try {
    const north = await login('client-northstar');
    const created = await app.request(
      origin + '/api/cases',
      {
        method: 'POST',
        headers: { ...mh, Cookie: north },
        body: JSON.stringify({
          title: 'New synthetic package',
          description: 'POC',
          currency: 'EUR',
          amountMinor: 1200000,
        }),
      },
      env,
    );
    assert.equal(created.status, 201);
    const body = await created.json();
    assert.equal(
      (
        await app.request(
          origin + '/api/cases',
          { headers: { Cookie: north } },
          env,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await app.request(
          origin + `/api/cases/${body.id}/submit`,
          {
            method: 'POST',
            headers: { ...mh, Cookie: north },
            body: '{"revision":1}',
          },
          env,
        )
      ).status,
      400,
    );
    const cedar = await login('client-cedar');
    assert.equal(
      (
        await app.request(
          origin + `/api/cases/${body.id}`,
          { headers: { Cookie: cedar } },
          env,
        )
      ).status,
      404,
    );
    const list: any = await (
      await app.request(
        origin + '/api/cases',
        { headers: { Cookie: cedar } },
        env,
      )
    ).json();
    assert.equal(list.cases.length, 0);
    assert.equal(
      (sql.prepare('SELECT COUNT(*) count FROM case_audit').get() as any).count,
      1,
    );
  } finally {
    sql.close();
  }
});

test('a posted case is visible to every manager and compliance officer assigned to the org, not just an assigned individual', async () => {
  const sql = new DatabaseSync(':memory:');
  for (const file of [
    'migrations/0001_identity.sql',
    'migrations/0002_cases_documents.sql',
    'migrations/0003_review_workflow.sql',
    'migrations/0004_simulated_analysis.sql',
    'seeds/local.sql',
  ])
    sql.exec(readFileSync(file, 'utf8'));
  // A second manager and a second compliance officer on the same floor,
  // neither of whom will ever claim this case via manager/start or forward.
  sql.exec(
    `INSERT INTO users(id, issuer, subject, display_name) VALUES
       ('manager-2','urn:dch:local','manager-2','Riley Second'),
       ('compliance-2','urn:dch:local','compliance-2','Sam Second');
     INSERT INTO memberships VALUES
       ('manager-2','bank-demo','manager',NULL),
       ('compliance-2','bank-demo','compliance',NULL);
     INSERT INTO staff_assignments VALUES
       ('manager-2','bank-demo','org-northstar'),
       ('compliance-2','bank-demo','org-northstar');`,
  );
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
  const app = createLocalApp();
  const origin = 'http://127.0.0.1';
  const mh = {
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
  try {
    const client = await login('client-northstar');
    const created: any = await (
      await app.request(
        origin + '/api/cases',
        {
          method: 'POST',
          headers: { ...mh, Cookie: client },
          body: JSON.stringify({
            title: 'Floor visibility case',
            description: 'POC',
            currency: 'EUR',
            amountMinor: 500000,
          }),
        },
        env,
      )
    ).json();
    const fd = new FormData();
    fd.set('kind', 'invoice');
    fd.set(
      'file',
      new File(
        [readFileSync('fixtures/documents/invoice-v1.pdf')],
        'invoice-v1.pdf',
        { type: 'application/pdf' },
      ),
    );
    assert.equal(
      (
        await app.request(
          origin + `/api/cases/${created.id}/documents`,
          {
            method: 'POST',
            headers: { Origin: origin, 'X-CSRF-Protection': '1', Cookie: client },
            body: fd,
          },
          env,
        )
      ).status,
      201,
    );
    assert.equal(
      (
        await app.request(
          origin + `/api/cases/${created.id}/submit`,
          { method: 'POST', headers: { ...mh, Cookie: client }, body: '{"revision":1}' },
          env,
        )
      ).status,
      200,
    );
    // Every manager and compliance officer on the Northstar floor can see the
    // posted case in both the list and detail views before anyone claims it.
    for (const accountId of [
      'manager',
      'manager-2',
      'compliance',
      'compliance-2',
    ]) {
      const cookie = await login(accountId);
      const list: any = await (
        await app.request(origin + '/api/cases', { headers: { Cookie: cookie } }, env)
      ).json();
      assert.ok(
        list.cases.some((item: any) => item.id === created.id),
        `${accountId} should see the posted case in the floor list`,
      );
      assert.equal(
        (
          await app.request(
            origin + `/api/cases/${created.id}`,
            { headers: { Cookie: cookie } },
            env,
          )
        ).status,
        200,
        `${accountId} should be able to open the posted case`,
      );
    }
  } finally {
    sql.close();
  }
});
