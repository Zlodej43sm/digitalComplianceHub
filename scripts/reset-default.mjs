import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { run } from './recovery-lib.mjs';
import { writeHostedConfig } from './cloudflare-config.mjs';

const localDatabase = 'dch-local-metadata';
const localBucket = 'dch-local-documents';
const demoDatabase = 'dch-demo-metadata';
const clearBusinessData =
  'PRAGMA foreign_keys=ON; DELETE FROM analysis_results; DELETE FROM analysis_outbox; DELETE FROM analysis_jobs; DELETE FROM review_decisions; DELETE FROM review_checklist; DELETE FROM case_messages; DELETE FROM notifications; DELETE FROM case_audit; DELETE FROM document_versions; DELETE FROM documents; DELETE FROM cases; DELETE FROM local_sessions;';

export function parseResetDefaultArgs(argv) {
  const environment = argv[0];
  if (!['local', 'demo'].includes(environment))
    throw new Error(
      'Usage: pnpm reset:default <local|demo> [--origin=URL] [--confirm=dch-demo-metadata] [--dry-run]',
    );
  const options = Object.fromEntries(
    argv.slice(1).map((argument) => {
      if (argument === '--dry-run') return ['dryRun', true];
      const match = /^--(origin|confirm)=(.+)$/.exec(argument);
      if (!match) throw new Error(`Unknown argument: ${argument}`);
      return [match[1], match[2]];
    }),
  );
  if (environment === 'demo' && options.confirm !== demoDatabase)
    throw new Error(`Demo reset requires --confirm=${demoDatabase}`);
  if (options.origin) {
    const origin = new URL(options.origin);
    if (
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash ||
      (environment === 'local'
        ? origin.protocol !== 'http:' ||
          !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname)
        : origin.protocol !== 'https:')
    )
      throw new Error(`Invalid ${environment} origin`);
    options.origin = origin.origin;
  }
  return { environment, ...options };
}

async function requireSeedEndpoint(origin) {
  const health = await fetch(`${origin}/api/health`);
  const accounts = await fetch(`${origin}/api/local/accounts`);
  if (!health.ok || !accounts.ok)
    throw new Error(
      `The demo app must be running in fictional-account mode at ${origin} before reset.`,
    );
}

function localObjectKeys() {
  const output = run(
    'pnpm',
    [
      'exec',
      'wrangler',
      'd1',
      'execute',
      localDatabase,
      '--local',
      '--command',
      'SELECT DISTINCT object_key key FROM document_versions ORDER BY object_key;',
      '--json',
    ],
    { capture: true },
  );
  return JSON.parse(output).flatMap((item) => item.results ?? []);
}

async function resetLocal(origin) {
  await requireSeedEndpoint(origin);
  for (const { key } of localObjectKeys())
    run('pnpm', [
      'exec',
      'wrangler',
      'r2',
      'object',
      'delete',
      `${localBucket}/${key}`,
      '--local',
    ]);
  run('pnpm', [
    'exec',
    'wrangler',
    'd1',
    'execute',
    localDatabase,
    '--local',
    '--command',
    clearBusinessData,
  ]);
  run('pnpm', ['setup:local']);
  run('node', ['scripts/seed-demo-scenarios.mjs', origin]);
  console.log(
    `Local database reset to the canonical seven-case dataset at ${origin}.`,
  );
}

async function resetDemo(originOverride) {
  const configPath = writeHostedConfig('demo');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const origin = originOverride ?? config.vars.APP_ORIGIN;
  await requireSeedEndpoint(origin);
  run('node', [
    'scripts/cloudflare-reset.mjs',
    'demo',
    `--confirm=${demoDatabase}`,
  ]);
  run('pnpm', [
    'exec',
    'wrangler',
    'd1',
    'execute',
    demoDatabase,
    '--remote',
    '--config',
    configPath,
    '--file',
    'seeds/hosted-demo.sql',
  ]);
  run('node', ['scripts/seed-demo-scenarios.mjs', origin]);
  run('node', ['scripts/hosted-smoke.mjs', origin]);
  console.log(
    `Cloudflare demo reset to the canonical seven-case dataset at ${origin}.`,
  );
}

export async function resetDefault(options) {
  const origin =
    options.origin ??
    (options.environment === 'local' ? 'http://127.0.0.1:5178' : undefined);
  if (options.dryRun) {
    console.log(
      options.environment === 'local'
        ? `Would clear local D1/R2 and seed ${origin}. The local app must be running.`
        : `Would back up and clear Cloudflare demo D1/R2, restore fictional identities, seed the configured demo origin, and run hosted smoke.`,
    );
    return;
  }
  if (options.environment === 'local') return resetLocal(origin);
  return resetDemo(origin);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await resetDefault(parseResetDefaultArgs(process.argv.slice(2)));
