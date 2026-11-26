import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
const browser = process.argv[2];
assert.ok(['chrome', 'firefox'].includes(browser));
const directory = '.output/' + browser + '-mv3/';
const manifest = JSON.parse(readFileSync(directory + 'manifest.json', 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual([...manifest.permissions].sort(), ['activeTab','alarms','scripting','storage']);
assert.ok((manifest.host_permissions ?? []).every(p => ['https://chatgpt.com/*','https://api.github.com/*'].includes(p)));
assert.equal(manifest.content_scripts?.length, 1, 'Only eligibility content script should remain');
assert.ok(manifest.content_scripts[0].js?.some(file => /eligibility/.test(file)));
assert.ok(!existsSync(directory + 'content-scripts/promotion.js'), 'Promotion overlay must not be packaged');
for (const script of manifest.content_scripts) {
  assert.deepEqual(script.matches, ['https://chatgpt.com/*']);
  for (const file of script.js ?? []) assert.ok(existsSync(directory + file));
}
assert.equal(typeof manifest.description, 'string');
assert.equal(manifest.default_locale, 'en');
assert.equal(manifest.description, '__MSG_extension_description__');
const readMessages = locale => JSON.parse(readFileSync(directory + '_locales/' + locale + '/messages.json', 'utf8'));
const defaultMessages = readMessages('en');
assert.ok(defaultMessages.extension_description.message.includes('ePlus.DEV'));
const languages = readdirSync(directory + '_locales');
for (const language of ['en','es','fr','hi','id','ja','ms','pt_BR','vi','zh_CN']) assert.ok(languages.includes(language));
for (const language of languages) {
  const messages = readMessages(language);
  assert.deepEqual(Object.keys(messages).sort(), Object.keys(defaultMessages).sort(), 'Missing translations in ' + language);
  assert.ok(Object.values(messages).every(({message}) => typeof message === 'string' && message.trim()));
  assert.ok(messages.extension_description.message.length <= 132);
}
assert.equal(readFileSync(directory + 'fonts/AlloVariable.woff2').subarray(0, 4).toString(), 'wOF2');
assert.ok(existsSync(directory + 'fonts/Allo-OFL.txt'));
for (const size of [16,32,48,96,128]) {
  const path = manifest.icons?.[String(size)];
  assert.ok(path, 'Missing extension icon '+size);
  const png = readFileSync(directory+path);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),size);
  assert.equal(png.readUInt32BE(20),size);
}
for (const size of [16,32,48]) assert.ok(existsSync(directory+manifest.action?.default_icon?.[String(size)]));
assert.ok(manifest.action?.default_popup);
assert.ok(existsSync(directory + manifest.action.default_popup));
assert.ok(manifest.host_permissions.includes('https://api.github.com/*'));
assert.ok(manifest.background?.service_worker || manifest.background?.scripts?.length);
if (browser === 'firefox') {
  assert.ok(manifest.browser_specific_settings?.gecko?.id);
  assert.equal(manifest.browser_specific_settings.gecko.update_url,'https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/download/firefox-updates/updates.json');
}
console.log(browser + ' manifest validated');
