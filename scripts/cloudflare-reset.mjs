import { bucketName, databaseName, exportBackup, query, requireEnvironment, run } from './recovery-lib.mjs';
import { writeHostedConfig } from './cloudflare-config.mjs';

const environment = requireEnvironment(process.argv[2]);
if (process.argv[3] !== `--confirm=${databaseName(environment)}`) throw new Error(`Reset requires --confirm=${databaseName(environment)}`);
const backup = exportBackup(environment);
const config = writeHostedConfig(environment);
const keys = query(environment, 'SELECT DISTINCT object_key key FROM document_versions');
for (const { key } of keys) run('pnpm', ['exec', 'wrangler', 'r2', 'object', 'delete', `${bucketName(environment)}/${key}`, '--remote', '--jurisdiction', 'eu']);
const sql = `PRAGMA foreign_keys=ON; DELETE FROM analysis_results; DELETE FROM analysis_outbox; DELETE FROM analysis_jobs; DELETE FROM review_decisions; DELETE FROM review_checklist; DELETE FROM case_messages; DELETE FROM notifications; DELETE FROM case_audit; DELETE FROM document_versions; DELETE FROM documents; DELETE FROM cases; DELETE FROM local_sessions;`;
run('pnpm', ['exec', 'wrangler', 'd1', 'execute', databaseName(environment), '--remote', '--config', config, '--command', sql, '--yes']);
console.log(`Reset complete after verified backup: ${backup}`);
