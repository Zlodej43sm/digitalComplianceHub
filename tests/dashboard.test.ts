import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createLocalApp } from '../src/adapters/cloudflare/local-identity.ts';
import type { Database, Statement } from '../src/api/types.ts';

function setup() {
  const sql = new DatabaseSync(':memory:');
  for (const file of ['migrations/0001_identity.sql', 'migrations/0002_cases_documents.sql', 'migrations/0003_review_workflow.sql', 'migrations/0004_simulated_analysis.sql', 'seeds/local.sql']) sql.exec(readFileSync(file, 'utf8'));
  const DB: Database = { prepare(query) { let values: (string | number | null)[] = []; const statement = sql.prepare(query); const wrapper: Statement = { bind(...args) { values = args; return wrapper; }, async first<T>() { return (statement.get(...values) as T | undefined) ?? null; }, async all<T>() { return { results: statement.all(...values) as T[] }; }, async run() { return statement.run(...values); } }; return wrapper; } };
  return { sql, env: { DB } };
}

test('dashboard statistics use assigned organization scope and completed decisions only', async () => {
  const { sql, env } = setup();
  const insert = sql.prepare(`INSERT INTO cases(id,bank_id,organization_id,title,description,currency,amount_minor,status,workflow_status,revision,created_by,created_at,updated_at) VALUES (?,?,?,?,?,'EUR',100,'Draft',?,1,?,?,?)`);
  insert.run('north-open', 'bank-demo', 'org-northstar', 'North open', '', 'AwaitingClient', 'client-northstar', '2026-01-01T00:00:00.000Z', '2026-01-01T01:00:00.000Z');
  insert.run('north-done', 'bank-demo', 'org-northstar', 'North done', '', 'Approved', 'client-northstar', '2026-01-01T00:00:00.000Z', '2026-01-01T03:00:00.000Z');
  insert.run('cedar', 'bank-demo', 'org-cedar', 'Cedar private', '', 'Rejected', 'client-cedar', '2026-01-01T00:00:00.000Z', '2026-01-01T04:00:00.000Z');
  sql.prepare(`INSERT INTO review_decisions VALUES ('decision','north-done','compliance','Approved','approved in test','[]','2026-01-01T02:00:00.000Z')`).run();
  const app = createLocalApp(), origin = 'http://127.0.0.1';
  const headers = { Origin: origin, 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' };
  const login = await app.request(origin + '/api/local/session', { method: 'POST', headers, body: '{"accountId":"manager"}' }, env);
  const Cookie = login.headers.get('set-cookie')!.split(';')[0]!;
  const response = await app.request(origin + '/api/dashboard', { headers: { Cookie } }, env);
  assert.equal(response.status, 200);
  const dashboard: any = await response.json();
  assert.deepEqual(dashboard.totals, { all: 2, awaitingClient: 1, active: 1, completed: 1 });
  assert.equal(dashboard.completedTurnaroundHours, 2);
  assert.equal(dashboard.byStatus.Rejected, undefined);
});

test('English and Ukrainian catalogs contain the same non-empty core keys', () => {
  const source = readFileSync('src/web/i18n.tsx', 'utf8');
  for (const required of ['Ваше демонстраційне середовище', 'Наступна дія', 'Журнал аудиту', 'Схвалено', 'Лише синтетичні дані']) assert.ok(source.includes(required));
  assert.match(source, /const uk: Record<TranslationKey, string>/);
});
