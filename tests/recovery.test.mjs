import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requireEnvironment, validateManifest } from '../scripts/recovery-lib.mjs';

test('recovery commands reject unknown environments and production restore', () => {
  assert.equal(requireEnvironment('demo'), 'demo');
  assert.throws(() => requireEnvironment('production'));
  assert.throws(() => requireEnvironment('demo', { allowDemo: false }));
});
test('backup manifests require checksums, sizes and explicit environment metadata', () => {
  const hash = 'a'.repeat(64);
  const valid = { format: 1, environment: 'demo', database: { file: 'database.sql', sha256: hash }, objects: [{ key: 'private/key', file: 'objects/1.bin', sha256: hash, size: 12 }] };
  assert.equal(validateManifest(valid), valid);
  assert.throws(() => validateManifest({ ...valid, environment: 'production' }));
  assert.throws(() => validateManifest({ ...valid, objects: [{ ...valid.objects[0], sha256: 'bad' }] }));
});
