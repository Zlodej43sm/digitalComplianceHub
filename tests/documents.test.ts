import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createLocalApp } from '../src/adapters/cloudflare/local-identity.ts';
import type { Database, Statement } from '../src/api/types.ts';

function database(sql: DatabaseSync, failFinalization = false): Database {
  return {
    prepare(query) {
      let values: (string | number | null)[] = [];
      const statement = sql.prepare(query);
      const adapter: Statement = {
        bind(...args) {
          values = args;
          return adapter;
        },
        async first<T>() {
          return (statement.get(...values) as T | undefined) ?? null;
        },
        async all<T>() {
          return { results: statement.all(...values) as T[] };
        },
        async run() {
          if (failFinalization && query.startsWith('INSERT INTO document_versions'))
            throw new Error('simulated finalization failure');
          return statement.run(...values);
        },
      };
      return adapter;
    },
  };
}

function seededDatabase() {
  const sql = new DatabaseSync(':memory:');
  for (const file of [
    'migrations/0001_identity.sql',
    'migrations/0002_cases_documents.sql',
    'migrations/0003_review_workflow.sql',
    'migrations/0004_simulated_analysis.sql',
    'seeds/local.sql',
  ])
    sql.exec(readFileSync(file, 'utf8'));
  return sql;
}

test('document intake enforces name/kind pairing, type, size and case version limits', async () => {
  const sql = seededDatabase();
  const objects = new Map<string, Uint8Array>();
  const DOCUMENTS = {
    async put(key: string, value: ArrayBuffer | Uint8Array) {
      objects.set(key, new Uint8Array(value));
    },
    async get(key: string) {
      const value = objects.get(key);
      return value
        ? { body: new Blob([value.buffer as ArrayBuffer]).stream() }
        : null;
    },
    async delete(key: string) {
      objects.delete(key);
    },
  };
  const env = { DB: database(sql), DOCUMENTS };
  const app = createLocalApp();
  const origin = 'http://127.0.0.1';
  const mutationHeaders = { Origin: origin, 'X-CSRF-Protection': '1' };
  try {
    const login = await app.request(
      `${origin}/api/local/session`,
      {
        method: 'POST',
        headers: { ...mutationHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'client-northstar' }),
      },
      env,
    );
    const cookie = login.headers.get('set-cookie')!.split(';')[0]!;
    const created: any = await (
      await app.request(
        `${origin}/api/cases`,
        {
          method: 'POST',
          headers: {
            ...mutationHeaders,
            'Content-Type': 'application/json',
            Cookie: cookie,
          },
          body: JSON.stringify({
            title: 'Document policy case',
            currency: 'EUR',
            amountMinor: 1200000,
          }),
        },
        env,
      )
    ).json();
    const fixture = readFileSync('fixtures/documents/invoice-v1.pdf');
    async function upload(file: File, kind = 'invoice') {
      const form = new FormData();
      form.set('kind', kind);
      form.set('file', file);
      return app.request(
        `${origin}/api/cases/${created.id}/documents`,
        { method: 'POST', headers: { ...mutationHeaders, Cookie: cookie }, body: form },
        env,
      );
    }

    const renamed = await upload(new File([fixture], 'renamed.pdf', { type: 'application/pdf' }));
    assert.equal(renamed.status, 400);
    assert.match((await renamed.json()).error, /does not match the expected naming/);

    const wrongKindName = await upload(new File([fixture], 'contract.pdf', { type: 'application/pdf' }));
    assert.equal(wrongKindName.status, 400);
    assert.match((await wrongKindName.json()).error, /invoice-v1\.pdf/);

    const wrongType = await upload(new File([fixture], 'invoice-v1.pdf', { type: 'text/plain' }));
    assert.equal(wrongType.status, 400);
    assert.match((await wrongType.json()).error, /Expected a PDF file/);

    const wrongKind = await upload(new File([fixture], 'invoice-v1.pdf', { type: 'application/pdf' }), 'letter');
    assert.equal(wrongKind.status, 400);
    assert.match((await wrongKind.json()).error, /Unsupported document kind "letter"/);
    assert.equal(
      (
        await upload(
          new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'invoice-v1.pdf', {
            type: 'application/pdf',
          }),
        )
      ).status,
      400,
    );
    for (let version = 1; version <= 10; version++)
      assert.equal(
        (await upload(new File([fixture], 'invoice-v1.pdf', { type: 'application/pdf' }))).status,
        201,
      );
    assert.equal(
      (await upload(new File([fixture], 'invoice-v1.pdf', { type: 'application/pdf' }))).status,
      409,
    );
    assert.equal(objects.size, 10);
    assert.equal(
      (sql.prepare('SELECT COUNT(*) count FROM document_versions').get() as any).count,
      10,
    );
  } finally {
    sql.close();
  }
});

test('document intake accepts any PDF content once the name matches its declared kind', async () => {
  const sql = seededDatabase();
  const objects = new Map<string, Uint8Array>();
  const DOCUMENTS = {
    async put(key: string, value: ArrayBuffer | Uint8Array) {
      objects.set(key, new Uint8Array(value));
    },
    async get(key: string) {
      const value = objects.get(key);
      return value
        ? { body: new Blob([value.buffer as ArrayBuffer]).stream() }
        : null;
    },
    async delete(key: string) {
      objects.delete(key);
    },
  };
  const env = { DB: database(sql), DOCUMENTS };
  const app = createLocalApp();
  const origin = 'http://127.0.0.1';
  const mutationHeaders = { Origin: origin, 'X-CSRF-Protection': '1' };
  try {
    const login = await app.request(
      `${origin}/api/local/session`,
      {
        method: 'POST',
        headers: { ...mutationHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'client-northstar' }),
      },
      env,
    );
    const cookie = login.headers.get('set-cookie')!.split(';')[0]!;
    const created: any = await (
      await app.request(
        `${origin}/api/cases`,
        {
          method: 'POST',
          headers: {
            ...mutationHeaders,
            'Content-Type': 'application/json',
            Cookie: cookie,
          },
          body: JSON.stringify({
            title: 'Arbitrary content case',
            currency: 'EUR',
            amountMinor: 500000,
          }),
        },
        env,
      )
    ).json();
    async function upload(file: File, kind: string) {
      const form = new FormData();
      form.set('kind', kind);
      form.set('file', file);
      return app.request(
        `${origin}/api/cases/${created.id}/documents`,
        { method: 'POST', headers: { ...mutationHeaders, Cookie: cookie }, body: form },
        env,
      );
    }
    const contract = await upload(
      new File([Buffer.from('a hand-authored contract, not a fixture')], 'contract.pdf', {
        type: 'application/pdf',
      }),
      'contract',
    );
    assert.equal(contract.status, 201);
    const invoice = await upload(
      new File([Buffer.from('a hand-authored invoice')], 'invoice-v3.pdf', {
        type: 'application/pdf',
      }),
      'invoice',
    );
    assert.equal(invoice.status, 201);
    assert.equal(objects.size, 2);
  } finally {
    sql.close();
  }
});

test('document intake removes an R2 object when metadata finalization fails', async () => {
  const sql = seededDatabase();
  const objects = new Map<string, Uint8Array>();
  const env = {
    DB: database(sql, true),
    DOCUMENTS: {
      async put(key: string, value: ArrayBuffer | Uint8Array) {
        objects.set(key, new Uint8Array(value));
      },
      async get() {
        return null;
      },
      async delete(key: string) {
        objects.delete(key);
      },
    },
  };
  const app = createLocalApp();
  const origin = 'http://127.0.0.1';
  const headers = { Origin: origin, 'X-CSRF-Protection': '1' };
  try {
    const login = await app.request(
      `${origin}/api/local/session`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'client-northstar' }),
      },
      env,
    );
    const cookie = login.headers.get('set-cookie')!.split(';')[0]!;
    const created: any = await (
      await app.request(
        `${origin}/api/cases`,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json', Cookie: cookie },
          body: JSON.stringify({ title: 'Cleanup case', currency: 'EUR', amountMinor: 1 }),
        },
        env,
      )
    ).json();
    const form = new FormData();
    form.set('kind', 'invoice');
    form.set(
      'file',
      new File([readFileSync('fixtures/documents/invoice-v1.pdf')], 'invoice-v1.pdf', {
        type: 'application/pdf',
      }),
    );
    const response = await app.request(
      `${origin}/api/cases/${created.id}/documents`,
      { method: 'POST', headers: { ...headers, Cookie: cookie }, body: form },
      env,
    );
    assert.equal(response.status, 503);
    assert.equal(objects.size, 0);
    assert.equal(
      (sql.prepare('SELECT COUNT(*) count FROM document_versions').get() as any).count,
      0,
    );
  } finally {
    sql.close();
  }
});
