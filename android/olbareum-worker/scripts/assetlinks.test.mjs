import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAssetLinks, packageName } from './assetlinks.mjs';

const cert = Array(32).fill('AB').join(':');
test('rejects missing, placeholder and invalid certificates', () => {
  for (const input of [[], ['REPLACE_ME'], ['AB:CD'], [cert, 'invalid']]) {
    assert.throws(() => mergeAssetLinks([], input));
  }
});
test('preserves other apps and replaces only this package, normalizes and deduplicates certificates', () => {
  const other = { target: { package_name: 'other.app', sha256_cert_fingerprints: ['existing'] } };
  const old = { target: { package_name: packageName, sha256_cert_fingerprints: ['old'] } };
  const existing = [other, old];
  const result = mergeAssetLinks(existing, [cert.toLowerCase(), cert]);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], other);
  assert.deepEqual(result[1].target.sha256_cert_fingerprints, [cert]);
  assert.equal(existing.length, 2);
  assert.deepEqual(existing[1], old);
});
