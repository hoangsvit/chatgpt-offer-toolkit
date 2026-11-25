const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('utils/eligibility.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const campaign='team-1-month-free';
const profile=(assigned=true)=>({accounts:{default:{account:{structure:'personal',plan_type:'plus'},eligible_promo_campaigns:assigned?{team:{id:campaign}}:{}}}});
const coupon=(state='eligible',redemption={redeemed:false,redeemed_by_user:false,redeemed_by_workspace:false})=>({coupon:campaign,state,redemption});
async function run(responses,origin='https://chatgpt.com'){
 const calls=[];
 const ctx=vm.createContext({exports:{},location:{origin},AbortSignal,fetch:async(path,options)=>{
  calls.push(path);assert.ok(!options.method||options.method==='GET');assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');
  const value=responses.shift();if(!value)throw Error('unexpected request');
  return {ok:value.status===undefined||value.status===200,status:value.status??200,json:async()=>value.body};
 }});
 vm.runInContext(source,ctx);
 const result=await ctx.exports.checkOfferEligibility();return {result,calls};
}
const session={body:{accessToken:'synthetic-token'}};
test('assigned coupon explicitly eligible, no price or token returned',async()=>{
 const {result,calls}=await run([session,{body:profile()},{body:coupon()}]);
 assert.equal(result.state,'eligible');assert.equal(result.campaign,'assigned');assert.equal(calls.length,3);
 assert.ok(!JSON.stringify(result).includes('synthetic-token'));assert.match(result.reason,/not verified/);
});
test('unassigned campaign is unknown and does not query coupon',async()=>{
 const {result,calls}=await run([session,{body:profile(false)}]);assert.equal(result.state,'unknown');assert.equal(result.campaign,'not_listed');assert.equal(calls.length,2);
});
test('explicit negative or redemption wins',async()=>{
 for(const [body,state] of [[coupon('not_eligible'),'not_eligible'],[coupon('eligible',{redeemed_by_user:true}),'redeemed']]){
  assert.equal((await run([session,{body:profile()},{body}])).result.state,state);
 }
});
test('missing redemption or unexpected coupon is unknown',async()=>{
 for(const body of [coupon('eligible',{}),{...coupon(),coupon:'other'},null]){
  assert.equal((await run([session,{body:profile()},{body}])).result.state,'unknown');
 }
});
test('no session, foreign origin or non-personal account stops safely',async()=>{
 assert.equal((await run([],'https://example.org')).calls.length,0);
 assert.equal((await run([{body:{}}])).calls.length,1);
 const p=profile();p.accounts.default.account.structure='team';
 const r=await run([session,{body:p}]);assert.equal(r.result.state,'unknown');assert.equal(r.calls.length,2);
});
test('HTTP failure never reports eligible',async()=>{
 const r=await run([session,{body:profile()},{status:403}]);assert.equal(r.result.state,'unknown');assert.equal(r.calls.length,3);
});
