import { spawnSync } from 'node:child_process';
import { writeHostedConfig } from './cloudflare-config.mjs';
import { verifyBuild } from './verify-build.mjs';
const environment = process.argv[2];
const configPath = writeHostedConfig(environment);
const result = spawnSync('pnpm', ['exec', 'vite', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, DCH_CONFIG_PATH: configPath },
});
if (result.status !== 0) process.exit(result.status ?? 1);
verifyBuild(`dist/digital_compliance_hub_${environment}`);
