import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hostedConfig } from '../scripts/cloudflare-config.mjs';

test('hosted configuration requires complete identifiers and disables public aliases', () => {
  const input = {
    accountId: 'a'.repeat(32),
    dev: {
      hostname: 'developer.example.com',
      databaseId: '12345678-1234-1234-1234-123456789abc',
    },
  };
  const config = hostedConfig(input, 'dev');
  assert.equal(config.vars.ACCESS_ISSUER, undefined);
  assert.equal(config.vars.ACCESS_AUDIENCE, undefined);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.equal(config.assets.run_worker_first, true);
  assert.equal(config.r2_buckets[0].jurisdiction, 'eu');
  assert.equal(config.vars.APP_ORIGIN, 'https://developer.example.com');
  assert.throws(() => hostedConfig({}, 'dev'));
  assert.throws(() => hostedConfig(input, 'production'));
  assert.throws(() => hostedConfig(input, 'demo'));
  assert.throws(() =>
    hostedConfig(
      { ...input, dev: { ...input.dev, hostname: 'demo.workers.dev' } },
      'dev',
    ),
  );
  assert.throws(() =>
    hostedConfig({ ...input, dev: { ...input.dev, databaseId: null } }, 'dev'),
  );
});
