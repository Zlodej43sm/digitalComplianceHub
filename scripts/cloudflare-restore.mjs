import { join } from 'node:path';
import { bucketName, databaseName, readManifest, requireEnvironment, run, sha256 } from './recovery-lib.mjs';
import { writeHostedConfig } from './cloudflare-config.mjs';

const environment = requireEnvironment(process.argv[2], { allowDemo: false });
const backupDirectory = process.argv[3];
const confirmation = process.argv[4];
if (!backupDirectory || confirmation !== `--confirm=${databaseName(environment)}`) throw new Error(`Restore is allowed only to dev and requires --confirm=${databaseName(environment)}`);
const { root, manifest } = readManifest(backupDirectory);
const config = writeHostedConfig(environment), databaseFile = join(root, manifest.database.file);
if (sha256(databaseFile) !== manifest.database.sha256) throw new Error('Database export checksum mismatch.');
run('pnpm', ['exec', 'wrangler', 'd1', 'execute', databaseName(environment), '--remote', '--config', config, '--file', databaseFile, '--yes']);
for (const object of manifest.objects) {
  const file = join(root, object.file); if (sha256(file) !== object.sha256) throw new Error(`Object checksum mismatch: ${object.key}`);
  run('pnpm', ['exec', 'wrangler', 'r2', 'object', 'put', `${bucketName(environment)}/${object.key}`, '--remote', '--jurisdiction', 'eu', '--file', file, '--content-type', object.mediaType, '--force']);
}
console.log(`Restore complete in ${environment}. Verify counts and permissions before use.`);
