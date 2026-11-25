const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('entrypoints/popup/index.html','utf8'),main=fs.readFileSync('entrypoints/popup/main.ts','utf8');
test('popup keeps unique IDs for all direct runtime element lookups',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const m of main.matchAll(/(?:element(?:<[^>]+>)?|field|button)\('([^']+)'\)/g))assert.ok(ids.includes(m[1]),m[1]);
});
test('Offer is default and Settings and price review start hidden',()=>{
 assert.match(html,/id="view-offer" aria-pressed="true"/);
 assert.match(html,/id="view-settings" aria-pressed="false"/);
 assert.match(html,/id="settings-view" hidden/);
 assert.match(html,/id="price-panel" hidden/);
});

test('BeUI CTA and native checkout defaults are separated',()=>{
 assert.match(html,/id="beui-generate"/);
 assert.match(html,/id="settings-view" hidden>[\s\S]*?id="settings"/);
 assert.match(html,/id="generate" type="submit" disabled hidden/);
 assert.match(main,/form\.checkValidity\(\)/);
 assert.match(main,/form\.requestSubmit\(\)/);
});

test('promotion overlay and its settings are removed',()=>{
 assert.equal(fs.existsSync('entrypoints/promotion.content.ts'),false);
 assert.doesNotMatch(html,/banner-settings|banner-enabled|banner-reset/);
 assert.doesNotMatch(main,/loadBannerSettings|saveBannerSettings|BANNER_KEY/);
});
