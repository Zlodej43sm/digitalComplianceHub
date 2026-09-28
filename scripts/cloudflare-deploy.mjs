import { spawnSync } from 'node:child_process';
import { writeHostedConfig } from './cloudflare-config.mjs';

const environment = process.argv[2];
const configPath = writeHostedConfig(environment);
const result = spawnSync('pnpm', ['exec', 'wrangler', 'deploy', '--config', configPath], {
  stdio: 'inherit',
});

if (result.status !== 0) process.exit(result.status ?? 1);
