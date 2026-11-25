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

test('account status is visible with compact refresh and collapsed diagnostics',()=>{
 assert.match(html,/<section class="account-card" aria-label="Account eligibility">/);
 assert.match(html,/id="beui-refresh"/);
 assert.match(html,/<details class="account-details">/);
 assert.match(html,/id="eligibility-check" type="button" disabled hidden/);
 const island=fs.readFileSync('entrypoints/popup/beui/islands.tsx','utf8');
 assert.match(island,/function RefreshEligibility\(/);
 assert.match(island,/if\(!native\.disabled\)native\.click\(\)/);
 assert.match(main,/runEligibilityCheck\(true\)/);
});

test('popup uses the beUI ThemeToggle and upstream light/dark tokens',()=>{
 const island=fs.readFileSync('entrypoints/popup/beui/islands.tsx','utf8');
 const css=fs.readFileSync('entrypoints/popup/style.css','utf8');
 const theme=fs.readFileSync('entrypoints/popup/beui/theme.css','utf8');
 const adapter=fs.readFileSync('entrypoints/popup/beui/extension-theme.ts','utf8');
 assert.match(html,/id="beui-theme"/);
 assert.match(island,/<ThemeToggle variant="circle"/);
 assert.match(css,/@import "\.\/beui\/theme\.css"/);
 assert.match(theme,/\.dark \{[\s\S]*?--background: #151515/);
 assert.match(adapter,/offer-toolkit-theme/);
 assert.doesNotMatch(main,/button\('theme'\)|element\('moon'\)|element\('sun'\)/);
});
