import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const browser = process.argv[2];
assert.ok(['chrome', 'firefox'].includes(browser));
const directory = '.output/' + browser + '-mv3/';
const manifest = JSON.parse(readFileSync(directory + 'manifest.json', 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual([...manifest.permissions].sort(), ['activeTab','scripting','storage']);
assert.ok((manifest.host_permissions ?? []).every(p => p === 'https://chatgpt.com/*'));
assert.ok(manifest.content_scripts?.length);
for (const script of manifest.content_scripts) {
  assert.deepEqual(script.matches, ['https://chatgpt.com/*']);
  for (const file of script.js ?? []) assert.ok(existsSync(directory + file));
}
assert.ok(manifest.action?.default_popup);
assert.ok(existsSync(directory + manifest.action.default_popup));
if (browser === 'firefox') assert.ok(manifest.browser_specific_settings?.gecko?.id);
console.log(browser + ' manifest validated');
