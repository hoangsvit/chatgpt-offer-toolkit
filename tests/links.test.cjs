const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const context=vm.createContext({exports:{}});
vm.runInContext(ts.transpileModule(fs.readFileSync('utils/links.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
test('official offer and support links remain available in popup',()=>{
 assert.equal(context.exports.OFFER_URL,'https://chatgpt.com/?promo_campaign=team-1-month-free#pricing');
 assert.equal(context.exports.PLUS_PRICING_URL,'https://chatgpt.com/#pricing');
 assert.equal(context.exports.EPLUS_URL,'https://eplus.dev');assert.equal(context.exports.SUPPORT_URL,'https://t.me/eplus_news');
});
