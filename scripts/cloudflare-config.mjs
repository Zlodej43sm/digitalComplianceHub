import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function hostedConfig(input, environment) {
  if (!['dev', 'demo'].includes(environment))
    throw new Error('Choose dev or demo');
  const selected = input[environment];
  if (
    !selected ||
    !/^[a-f0-9]{32}$/.test(input.accountId ?? '') ||
    !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(
      selected.databaseId ?? '',
    ) ||
    !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(
      selected.hostname ?? '',
    ) ||
    /(?:\.invalid|\.workers\.dev|\.example|\.localhost)$/.test(
      selected.hostname,
    )
  ) {
    throw new Error(
      'Supply real account, D1 and custom-hostname values in cloudflare.local.json',
    );
  }
  const authMode = selected.authMode ?? 'demo';
  if (!['demo', 'access'].includes(authMode))
    throw new Error('authMode must be demo or access');
  if (
    authMode === 'access' &&
    (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(
      selected.accessIssuer ?? '',
    ) ||
      !/^[a-f0-9]{64}$/.test(selected.accessAudience ?? ''))
  )
    throw new Error('Access mode requires accessIssuer and accessAudience');
  return {
    $schema: './node_modules/wrangler/config-schema.json',
    name: `digital-compliance-hub-${environment}`,
    account_id: input.accountId,
    main: 'src/adapters/cloudflare/worker.ts',
    compatibility_date: '2026-09-28',
    workers_dev: false,
    preview_urls: false,
    routes: [{ pattern: selected.hostname, custom_domain: true }],
    assets: {
      directory: './dist/client',
      binding: 'ASSETS',
      not_found_handling: 'single-page-application',
      run_worker_first: true,
    },
    vars: {
      APP_ORIGIN: `https://${selected.hostname}`,
      AUTH_MODE: authMode,
      ...(authMode === 'access'
        ? {
            ACCESS_ISSUER: selected.accessIssuer,
            ACCESS_AUDIENCE: selected.accessAudience,
          }
        : {}),
    },
    d1_databases: [
      {
        binding: 'DB',
        database_name: `dch-${environment}-metadata`,
        database_id: selected.databaseId,
        migrations_dir: 'migrations',
      },
    ],
    r2_buckets: [
      {
        binding: 'DOCUMENTS',
        bucket_name: `dch-${environment}-documents`,
        jurisdiction: 'eu',
      },
    ],
    queues: {
      producers: [
        { binding: 'ANALYSIS_QUEUE', queue: `dch-${environment}-analysis` },
      ],
      consumers: [
        {
          queue: `dch-${environment}-analysis`,
          dead_letter_queue: `dch-${environment}-analysis-failed`,
          max_retries: 2,
        },
      ],
    },
    triggers: { crons: ['*/5 * * * *'] },
    observability: { enabled: false },
  };
}

export function writeHostedConfig(environment) {
  const inputPath = existsSync('cloudflare.local.json')
    ? 'cloudflare.local.json'
    : 'cloudflare.hosted.json';
  const config = hostedConfig(
    JSON.parse(readFileSync(inputPath, 'utf8')),
    environment,
  );
  const path = `wrangler.${environment}.generated.json`;
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  return path;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  console.log(`Created ${writeHostedConfig(process.argv[2])}`);
}
