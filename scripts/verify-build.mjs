import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

export function verifyBuild(
  workerDirectory = 'dist/digital_compliance_hub_local',
) {
  const worker = readFileSync(`${workerDirectory}/index.js`, 'utf8');
  for (const marker of [
    'dch_local_session',
    '/api/local/accounts',
    'INSERT INTO local_sessions',
    'urn:dch:local',
  ]) {
    assert.ok(
      !worker.includes(marker),
      `Production Worker contains development identity: ${marker}`,
    );
  }
  const config = JSON.parse(
    readFileSync(`${workerDirectory}/wrangler.json`, 'utf8'),
  );
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.equal(
    config.assets.run_worker_first,
    true,
    'All deployed assets must pass authentication',
  );
  for (const file of readdirSync('dist/client/assets').filter((file) =>
    file.endsWith('.js'),
  )) {
    const content = readFileSync(`dist/client/assets/${file}`, 'utf8');
    for (const marker of [
      '/api/local/',
      'Local test sign-in',
      'FX-2026-001',
      'Equipment supply agreement',
    ]) {
      assert.ok(
        !content.includes(marker),
        `Production browser bundle exposes local sign-in or case fixtures: ${marker}`,
      );
    }
  }
  console.log(
    'Production boundary passed: no local sign-in or bundled case data; all assets use the Worker.',
  );
}
