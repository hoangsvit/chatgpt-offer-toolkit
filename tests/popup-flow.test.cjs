const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const html = readFileSync('entrypoints/popup/index.html', 'utf8');
const source = readFileSync('entrypoints/popup/main.ts', 'utf8');
const islands = readFileSync('entrypoints/popup/beui/islands.tsx', 'utf8');
test('primary BeUI checkout action precedes the alternative official offer link; defaults stay in Settings', () => {
  const offerStart = html.indexOf('id="offer-view"');
  const settingsStart = html.indexOf('id="settings-view" hidden');
  const cta = html.indexOf('id="beui-generate"');
  const official = html.indexOf('id="official"');
  const form = html.indexOf('<form id="settings">');
  assert.ok(offerStart >= 0 && offerStart < cta && cta < official && official < settingsStart && settingsStart < form);
  assert.match(html, /id="generate" type="submit" disabled hidden/);
  assert.match(html, /id="official" type="button" class="secondary claim-button"/);
  assert.match(islands, /<Button[^>]*disabled=\{value\.disabled\}/);
  assert.match(islands, /if\(!native\.disabled\)submit\(\)/);
});
test('Generate validates required fields, opens settings if needed, and uses the existing requestCheckout handler', () => {
  assert.match(source, /if\(!form\.checkValidity\(\)\)\s*\{\s*showView\('settings'\);[\s\S]*?form\.reportValidity\(\);\s*return;/);
  assert.match(source, /form\.requestSubmit\(\)/);
  assert.match(source, /executeScript\(\{target:\{tabId\},func:requestCheckout,args:\[config\]\}\)/);
  assert.match(source, /tabs\.create\(\{url: OFFER_URL\}\)/);
});
