const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const ctx=vm.createContext({exports:{},URL});
vm.runInContext(ts.transpileModule(fs.readFileSync('utils/eligibility-badge.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);
const {badgeFor,isChatGPTUrl}=ctx.exports;
const eligible={state:'eligible',campaign:'assigned'};
const denied={state:'not_eligible',campaign:'assigned'};
const redeemed={state:'redeemed',campaign:'assigned'};
const absent={state:'unknown',campaign:'not_listed'};
const unknown={state:'unknown',campaign:'unknown'};
const cases=[
 ['eligible',eligible],['denied',denied],['redeemed',redeemed],['absent',absent],['unknown',unknown]
];
test('combined badge covers all 25 combinations independently',()=>{
 for(const [b,business] of cases) for(const [p,personal] of cases){
   const badge=badgeFor({...business,plus:personal});
   const expected=b==='eligible'&&p==='eligible'?'2/2':p==='eligible'?'P+':b==='eligible'?'B+':b==='unknown'||p==='unknown'?'?':b==='redeemed'&&p==='redeemed'?'USED':'NO';
   assert.equal(badge.text,expected,b+' / '+p);
   assert.equal(badge.color,expected==='2/2'||expected==='P+'||expected==='B+'?'#16845b':b==='denied'&&p==='denied'?'#b43b35':'#64736b');
   assert.match(badge.title,/Personal \(Plus\):.*Business:/);
   assert.ok(badge.text.length<=4);
 }
});
test('missing or unconfirmed plan results never count as eligible',()=>{
 for(const value of [null,{},unknown,denied,{state:'eligible',campaign:'unknown'},{...denied,plus:{state:'eligible',campaign:'unknown'}}])assert.equal(badgeFor(value).text,'?');
 assert.equal(badgeFor(eligible).text,'B+');
 assert.equal(badgeFor({plus:eligible}).text,'P+');
 assert.match(badgeFor({...eligible,plus:unknown}).title,/Personal \(Plus\): Unknown.*Business: Coupon eligible — final price not verified/);
 assert.match(badgeFor({...absent,plus:redeemed}).title,/final eligibility not verified/);
});
test('only exact HTTPS ChatGPT origin is accepted',()=>{
 assert.equal(isChatGPTUrl('https://chatgpt.com/c/test'),true);
 for(const value of ['https://chatgpt.com.evil.test','http://chatgpt.com','https://chatgpt.com:444',null,'invalid'])assert.equal(isChatGPTUrl(value),false);
});
