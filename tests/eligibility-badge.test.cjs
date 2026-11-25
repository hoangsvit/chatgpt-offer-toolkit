const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const ctx=vm.createContext({exports:{},URL});
vm.runInContext(ts.transpileModule(fs.readFileSync('utils/eligibility-badge.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);
const {badgeFor,isChatGPTUrl}=ctx.exports;
test('green badge requires confirmed coupon and assignment',()=>{
 assert.equal(badgeFor({state:'eligible',campaign:'assigned'}).text,'OK');
 assert.equal(badgeFor({state:'eligible',campaign:'unknown'}).text,'');
 assert.match(badgeFor({state:'eligible',campaign:'assigned'}).title,/price not verified/);
});
test('explicit denial is NO; unknown or redeemed clears badge',()=>{
 assert.equal(badgeFor({state:'not_eligible'}).text,'NO');
 for(const value of [null,{}, {state:'unknown'},{state:'redeemed'}])assert.equal(badgeFor(value).text,'');
});
test('only exact HTTPS ChatGPT origin is accepted',()=>{
 assert.equal(isChatGPTUrl('https://chatgpt.com/c/test'),true);
 for(const value of ['https://chatgpt.com.evil.test','http://chatgpt.com','https://chatgpt.com:444',null,'invalid'])assert.equal(isChatGPTUrl(value),false);
});
