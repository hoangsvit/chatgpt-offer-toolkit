const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const ctx=vm.createContext({exports:{}});
vm.runInContext(ts.transpileModule(fs.readFileSync('utils/billing-locale.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);
const {suggestBilling,currencyForCountry}=ctx.exports;
test('explicit browser regions suggest local currencies',()=>{
 for (const [locale,country,currency] of [['vi-VN','VN','VND'],['en-US','US','USD'],['en-GB','GB','GBP'],['de-DE','DE','EUR'],['ja-JP','JP','JPY'],['zh-Hant-TW','TW','TWD'],['en-SG','SG','SGD']]) {
   const result=suggestBilling([locale]);assert.equal(result.country,country);assert.equal(result.currency,currency);
 }
});
test('no inferred country for language-only or numeric region',()=>{
 assert.equal(suggestBilling(['en','vi','es-419']),null);
 assert.equal(suggestBilling(['bad!','en','vi-VN']).country,'VN');
});
test('unmapped region leaves currency empty rather than inventing USD',()=>{
 const result=suggestBilling(['en-FJ']);assert.equal(result.country,'FJ');assert.equal(result.currency,null);
 assert.equal(currencyForCountry('zz'),null);assert.equal(currencyForCountry('constructor'),null);
});
test('country edit suggests known currency case-insensitively',()=>{
 assert.equal(currencyForCountry(' jp '),'JPY');assert.equal(currencyForCountry('V'),null);
});

test('saved billing preference must contain explicit valid uppercase codes',()=>{
 const parse=ctx.exports.parseBillingPreference;
 assert.equal(parse({country:'VN',currency:'VND'}).country,'VN');
 assert.equal(parse({country:'US',currency:'USD'}).currency,'USD');
 for(const v of [null,{}, {country:'en-US',currency:'USD'},{country:'vn',currency:'VND'},{country:'VN',currency:'bad!'}])assert.equal(parse(v),null);
});
