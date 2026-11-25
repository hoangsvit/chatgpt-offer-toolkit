const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const html = readFileSync('entrypoints/popup/index.html', 'utf8');
const source = readFileSync('entrypoints/popup/main.ts', 'utf8');
test('primary checkout form is visible before the alternative official offer link', () => {
  const section = html.match(/<section class="checkout-section"[\s\S]*?<\/section>\s*<button id="official"/);
  assert.ok(section, 'Checkout Generator must not be hidden inside Advanced');
  assert.match(html, /<form id="settings">/);
  assert.match(html, /id="generate" type="submit" class="primary"/);
  assert.match(html, /id="official" type="button" class="secondary claim-button"/);
  assert.doesNotMatch(html, /Advanced checkout configuration/);
});
test('generate action retains the existing requestCheckout handler', () => {
  assert.match(source, /executeScript\(\{target:\{tabId\},func:requestCheckout,args:\[config\]\}\)/);
  assert.match(source, /tabs\.create\(\{url: OFFER_URL\}\)/);
});
