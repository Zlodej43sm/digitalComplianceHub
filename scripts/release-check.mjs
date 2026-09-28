import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { hostedConfig } from './cloudflare-config.mjs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal(packageJson.private, true);
assert.equal(packageJson.packageManager, 'pnpm@11.4.0');
for (const command of ['verify', 'backup:cloudflare', 'restore:cloudflare', 'reset:cloudflare', 'smoke:hosted', 'deploy:cloudflare']) assert.ok(packageJson.scripts[command], command);
for (const file of ['docs/demo-walkthrough.md', 'docs/release-runbook.md', 'docs/release-acceptance.md', 'fixtures/documents/contract.pdf', 'fixtures/documents/invoice-v1.pdf', 'fixtures/documents/invoice-v2.pdf']) assert.ok(existsSync(file), file);
const migrations = readdirSync('migrations').filter((file) => /^\d{4}_.+\.sql$/.test(file)).sort();
assert.deepEqual(migrations.map((file) => file.slice(0, 4)), migrations.map((_, index) => String(index + 1).padStart(4, '0')));
for (const file of migrations) assert.doesNotMatch(readFileSync(`migrations/${file}`, 'utf8'), /\b(?:DROP|TRUNCATE)\b/i, `${file} must remain additive`);
const sample = hostedConfig({ accountId: 'a'.repeat(32), demo: { hostname: 'demo.bank.test', databaseId: '12345678-1234-1234-1234-123456789abc' } }, 'demo');
assert.equal(sample.workers_dev, false); assert.equal(sample.preview_urls, false); assert.equal(sample.r2_buckets[0].jurisdiction, 'eu'); assert.ok(sample.queues.consumers[0].dead_letter_queue); assert.ok(sample.triggers.crons.length);
console.log(`Release check passed: ${migrations.length} additive migrations, pinned runtime, recovery commands, private EU storage and required runbooks.`);
