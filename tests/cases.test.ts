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
