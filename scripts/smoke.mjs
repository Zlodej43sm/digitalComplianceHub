import assert from 'node:assert/strict';
import { verifyBuild } from './verify-build.mjs';
import { readdirSync } from 'node:fs';

verifyBuild();
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const port = 4179;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
  },
);
let output = '';
server.stdout.on('data', (data) => {
  output = (output + String(data)).slice(-8000);
});
server.stderr.on('data', (data) => {
  output = (output + String(data)).slice(-8000);
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Preview exited: ${output}`);
    try {
      const response = await fetch(`${origin}/api/health`, {
        signal: AbortSignal.timeout(1000),
      });
      ready = response.ok;
    } catch {
      /* Server is starting. */
    }
    if (ready) break;
    await delay(200);
  }
  assert.ok(ready, `Preview did not start: ${output}`);
  const health = await fetch(`${origin}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.match(health.headers.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.equal(
    health.headers.get('permissions-policy'),
    'camera=(), microphone=(), geolocation=()',
  );
  assert.deepEqual(await health.json(), {
    status: 'ok',
    service: 'digital-compliance-hub',
  });
  for (const path of [
    '/api',
    '/api/unknown',
    '/api/cases',
    '/api/me',
    '/api/workspace',
  ]) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 401, path);
    assert.deepEqual(await response.json(), { error: 'Sign-in required' });
  }
  const accountResponse = await fetch(`${origin}/api/local/accounts`);
  assert.equal(accountResponse.status, 200);
  const accounts = await accountResponse.json();
  assert.equal(accounts.length, 5);
  for (const account of accounts) {
    const headers = {
      Origin: origin,
      'Content-Type': 'application/json',
      'X-CSRF-Protection': '1',
    };
    const login = await fetch(`${origin}/api/local/session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ accountId: account.id }),
    });
    assert.equal(login.status, 200);
    const Cookie = login.headers.get('set-cookie').split(';')[0];
    const me = await fetch(`${origin}/api/me`, { headers: { Cookie } });
    assert.equal((await me.json()).userId, account.id);
    const workspace = await fetch(`${origin}/api/workspace`, {
      headers: { Cookie },
    });
    assert.equal(workspace.status, account.role === 'demo-admin' ? 403 : 200);
    const logout = await fetch(`${origin}/api/local/logout`, {
      method: 'POST',
      headers: { ...headers, Cookie },
      body: '{}',
    });
    assert.equal(logout.status, 200);
    assert.equal(
      (await fetch(`${origin}/api/me`, { headers: { Cookie } })).status,
      401,
    );
  }
  const mutation = await fetch(`${origin}/api/health`, { method: 'POST' });
  assert.equal(mutation.status, 403);
  for (const path of [
    '/',
    '/preview/client/cases',
    '/preview/manager/cases/FX-2026-001',
    '/preview/compliance/workflow',
    ...readdirSync('dist/client/assets').map((file) => `/assets/${file}`),
  ]) {
    const response = await fetch(`${origin}${path}`, {
      headers: { Accept: 'text/html' },
    });
    assert.equal(response.status, 200, path);
  }
  console.log(
    'Smoke passed: health, no-store, protected APIs, public demo shell and rejected cross-origin mutation.',
  );
} catch (error) {
  console.error(output);
  throw error;
} finally {
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    delay(3000),
  ]);
  if (server.exitCode === null) server.kill('SIGKILL');
}
