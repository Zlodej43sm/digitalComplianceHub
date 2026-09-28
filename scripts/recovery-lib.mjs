import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeHostedConfig } from './cloudflare-config.mjs';

export function requireEnvironment(value, { allowDemo = true } = {}) {
  if (!['dev', ...(allowDemo ? ['demo'] : [])].includes(value)) throw new Error(`Environment must be ${allowDemo ? 'dev or demo' : 'dev'}.`);
  return value;
}
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: options.capture ? 'pipe' : 'inherit' });
  if (result.status !== 0) throw new Error(options.capture ? result.stderr || result.stdout : `${command} failed`);
  return result.stdout ?? '';
}
export function sha256(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
export function databaseName(environment) { return `dch-${environment}-metadata`; }
export function bucketName(environment) { return `dch-${environment}-documents`; }
export function query(environment, sql) {
  const config = writeHostedConfig(environment);
  const output = run('pnpm', ['exec', 'wrangler', 'd1', 'execute', databaseName(environment), '--remote', '--config', config, '--command', sql, '--json'], { capture: true });
  return JSON.parse(output).flatMap((item) => item.results ?? []);
}
function identifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
}
function literal(value) {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}
export function logicalExport(environment, output) {
  const schema = query(environment, `SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'trigger' THEN 2 ELSE 3 END,rowid`);
  const tables = schema.filter((item) => item.type === 'table');
  const lines = ['PRAGMA foreign_keys=OFF;', 'BEGIN TRANSACTION;', ...tables.map((item) => `${item.sql};`)];
  for (const table of tables) {
    const rows = query(environment, `SELECT * FROM ${identifier(table.name)}`);
    for (const row of rows) {
      const columns = Object.keys(row);
      lines.push(`INSERT INTO ${identifier(table.name)} (${columns.map(identifier).join(',')}) VALUES (${columns.map((column) => literal(row[column])).join(',')});`);
    }
  }
  lines.push(...schema.filter((item) => item.type !== 'table').map((item) => `${item.sql};`), 'COMMIT;', 'PRAGMA foreign_keys=ON;', '');
  writeFileSync(output, lines.join('\n'), { mode: 0o600 });
}
export function validateManifest(manifest) {
  if (manifest?.format !== 1 || !['dev', 'demo'].includes(manifest.environment) || !Array.isArray(manifest.objects) || !manifest.database?.file || !/^[a-f0-9]{64}$/.test(manifest.database.sha256 ?? '')) throw new Error('Invalid backup manifest.');
  for (const object of manifest.objects) if (!object.key || !object.file || !/^[a-f0-9]{64}$/.test(object.sha256 ?? '') || !Number.isSafeInteger(object.size)) throw new Error('Invalid object manifest entry.');
  return manifest;
}
export function exportBackup(environment, outputRoot = 'backups') {
  requireEnvironment(environment);
  const config = writeHostedConfig(environment);
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const directory = resolve(outputRoot, `${environment}-${stamp}`); mkdirSync(join(directory, 'objects'), { recursive: true });
  const databaseFile = join(directory, 'database.sql');
  const native = spawnSync('pnpm', ['exec', 'wrangler', 'd1', 'export', databaseName(environment), '--remote', '--config', config, '--output', databaseFile, '--skip-confirmation'], { encoding: 'utf8', stdio: 'pipe' });
  if (native.status !== 0) {
    console.warn('Native D1 export was unavailable; using the verified logical-export fallback.');
    logicalExport(environment, databaseFile);
  }
  const rows = query(environment, `SELECT DISTINCT v.object_key key,v.sha256,v.size_bytes size,v.media_type FROM document_versions v ORDER BY v.object_key`);
  const objects = [];
  for (const [index, row] of rows.entries()) {
    const file = join('objects', `${String(index + 1).padStart(4, '0')}-${createHash('sha256').update(row.key).digest('hex').slice(0, 16)}.bin`);
    const destination = join(directory, file);
    run('pnpm', ['exec', 'wrangler', 'r2', 'object', 'get', `${bucketName(environment)}/${row.key}`, '--remote', '--jurisdiction', 'eu', '--file', destination]);
    const actual = sha256(destination), size = readFileSync(destination).byteLength;
    if (actual !== row.sha256 || size !== row.size) throw new Error(`R2 verification failed for ${row.key}`);
    objects.push({ key: row.key, file, sha256: actual, size, mediaType: row.media_type });
  }
  const migrations = query(environment, `SELECT name FROM d1_migrations ORDER BY id`).map((row) => row.name);
  const counts = query(environment, `SELECT (SELECT COUNT(*) FROM cases) cases,(SELECT COUNT(*) FROM document_versions) documentVersions,(SELECT COUNT(*) FROM review_decisions) decisions,(SELECT COUNT(*) FROM notifications) notifications,(SELECT COUNT(*) FROM analysis_jobs) analysisJobs`)[0];
  const manifest = { format: 1, environment, createdAt: new Date().toISOString(), database: { file: basename(databaseFile), sha256: sha256(databaseFile), migrations, counts }, objects };
  writeFileSync(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
  return directory;
}
export function readManifest(directory) {
  const root = resolve(directory), path = join(root, 'manifest.json');
  if (!existsSync(path)) throw new Error('Backup manifest not found.');
  return { root, manifest: validateManifest(JSON.parse(readFileSync(path, 'utf8'))) };
}
