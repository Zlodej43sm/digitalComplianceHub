import assert from 'node:assert/strict';
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
  assert.deepEqual(await health.json(), {
    status: 'ok',
    service: 'digital-compliance-hub',
  });
  for (const path of ['/api', '/api/unknown', '/api/cases']) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 404, path);
    assert.deepEqual(await response.json(), { error: 'Not found' });
  }
  const mutation = await fetch(`${origin}/api/health`, { method: 'POST' });
  assert.equal(mutation.status, 404);
  for (const path of [
    '/',
    '/preview/client/cases',
    '/preview/manager/cases/FX-2026-001',
    '/preview/compliance/workflow',
  ]) {
    const response = await fetch(`${origin}${path}`, {
      headers: { Accept: 'text/html' },
    });
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(html.includes('<div id="root"></div>'), path);
    assert.ok(
      !html.includes('/src/web/main.tsx'),
      'Built assets must be served',
    );
  }
  console.log(
    'Smoke passed: health, no-store, API 404s, rejected mutation and nested SPA routes.',
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
