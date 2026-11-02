import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const packageName = 'com.olbareum.worker';
export function mergeAssetLinks(existing, fingerprints) {
  if (!Array.isArray(existing)) throw new Error('Existing assetlinks must be an array');
  const normalized = [...new Set(fingerprints.map(value => value.trim().toUpperCase()))];
  if (!normalized.length || normalized.some(value => !/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value))) {
    throw new Error('Provide real SHA-256 certificate fingerprints (32 colon-separated bytes)');
  }
  return [
    ...existing.filter(entry => entry.target?.package_name !== packageName),
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: normalized },
    },
  ];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const filename = fileURLToPath(new URL('../../../public/.well-known/assetlinks.json', import.meta.url));
  const fingerprints = process.argv.slice(2);
  const existing = JSON.parse(readFileSync(filename, 'utf8'));
  writeFileSync(filename, JSON.stringify(mergeAssetLinks(existing, fingerprints), null, 2) + '\n');
  console.log('Updated assetlinks for ' + packageName + '; existing apps preserved.');
}
