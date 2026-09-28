import { readFileSync, writeFileSync } from 'node:fs';
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
    !/^[a-f0-9]{64}$/.test(selected.accessAudience ?? '') ||
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(
      input.accessIssuer ?? '',
    ) ||
    !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(
      selected.hostname ?? '',
    ) ||
    /(?:\.invalid|\.workers\.dev|\.example|\.localhost)$/.test(
      selected.hostname,
    )
  ) {
    throw new Error(
      'Supply real account, D1, Access and custom-hostname values in cloudflare.local.json',
    );
  }
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
      ACCESS_ISSUER: input.accessIssuer,
      ACCESS_AUDIENCE: selected.accessAudience,
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
    observability: { enabled: false },
  };
}

export function writeHostedConfig(environment) {
  const config = hostedConfig(
    JSON.parse(readFileSync('cloudflare.local.json', 'utf8')),
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
