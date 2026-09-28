import { exportBackup, requireEnvironment } from './recovery-lib.mjs';
const environment = requireEnvironment(process.argv[2]);
console.log(`Backup complete: ${exportBackup(environment, process.argv[3] ?? 'backups')}`);
