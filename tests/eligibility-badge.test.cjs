const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const ctx=vm.createContext({exports:{},URL});
vm.runInContext(ts.transpileModule(fs.readFileSync('utils/eligibility-badge.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);
const {badgeFor,isChatGPTUrl}=ctx.exports;
test('green badge requires confirmed coupon and assignment',()=>{
 assert.equal(badgeFor({state:'eligible',campaign:'assigned'}).text,'OK');
 assert.equal(badgeFor({state:'eligible',campaign:'unknown'}).text,'?');
 assert.match(badgeFor({state:'eligible',campaign:'assigned'}).title,/price not verified/);
});
test('explicit denial is NO, redeemed is USED and unknown is visibly distinct',()=>{
 assert.equal(badgeFor({state:'not_eligible'}).text,'NO');
 assert.equal(badgeFor({state:'redeemed'}).text,'USED');
 for(const value of [null,{}, {state:'unknown'}])assert.equal(badgeFor(value).text,'?');
});
test('only exact HTTPS ChatGPT origin is accepted',()=>{
 assert.equal(isChatGPTUrl('https://chatgpt.com/c/test'),true);
 for(const value of ['https://chatgpt.com.evil.test','http://chatgpt.com','https://chatgpt.com:444',null,'invalid'])assert.equal(isChatGPTUrl(value),false);
});

test('successful account check without assigned campaign is distinct from an unknown check',()=>{
 const badge=badgeFor({state:'unknown',campaign:'not_listed'});
 assert.equal(badge.text,'N/A');assert.match(badge.title,/final eligibility not verified/);
 assert.equal(badgeFor({state:'unknown',campaign:'unknown'}).text,'?');
 assert.equal(badgeFor({state:'not_eligible',campaign:'not_listed'}).text,'NO');
});
