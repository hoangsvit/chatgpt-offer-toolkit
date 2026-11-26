const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const ts = require("typescript");
const { webcrypto } = require("node:crypto");
const source = ts.transpileModule(fs.readFileSync("utils/checkout.ts","utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
function load({origin="https://chatgpt.com",fetch=async()=>{throw Error("unexpected request")}}={}){
  const ctx=vm.createContext({URL,crypto:webcrypto,location:{origin},fetch,exports:{}});
  vm.runInContext(source,ctx);
  return ctx.exports;
}
const config={workspace:"MyTeam",seats:5,country:"VN",currency:"USD"};
const plusConfig={plan:"plus",country:"VN",currency:"VND",appearance:"light"};
const plusPromo="plus-synthetic";
const plusAccountId="00000000-0000-4000-8000-000000000001";
const checkedPlus={coupon:plusPromo,state:"eligible",redemption:{redeemed:false,redeemed_by_user:false,redeemed_by_workspace:false}};
function mockPlus(coupon=checkedPlus,changes={}) {
 const calls=[];
 const data=[
  {accessToken:"sample-token"},
  {accounts:{default:{account:{structure:"personal",account_id:plusAccountId},eligible_promo_campaigns:{plus:{id:plusPromo}}}}},
  coupon,
  {checkout_ui_mode:"custom",plan_name:"chatgptplusplan",processor_entity:"openai_llc",checkout_session_id:"oaics_"+"a".repeat(32),promo_campaign:{promo_campaign_id:plusPromo},url:null,...changes}
 ];
 const api=load({fetch:async (path,options)=>{
  const body=data[calls.length];calls.push({path,options});return {ok:true,json:async()=>body};
 }});
 return {api,calls};
}
test("Plus builds a new checkout URL from a verified account campaign and session",async()=>{
 const {api,calls}=mockPlus();
 assert.equal(api.validateConfig(plusConfig).currency,"VND");
 const result=await api.requestCheckout(plusConfig);
 const url=new URL(result.url);
 assert.equal(url.origin,"https://chatgpt.com");
 assert.equal(url.pathname,"/checkout/openai_llc/oaics_"+"a".repeat(32));
 assert.equal(url.searchParams.get("promo_campaign"),plusPromo);
 assert.equal(url.searchParams.get("source"),"chatgpt_web_merged");
 assert.equal(calls.length,4);
 assert.equal(calls[2].options.headers["ChatGPT-Account-Id"],plusAccountId);
 const payload=JSON.parse(calls[3].options.body);
 assert.equal(payload.plan_name,"chatgptplusplan");
 assert.equal(payload.checkout_ui_mode,"custom");
 assert.equal(payload.team_plan_data,undefined);
 assert.match(payload.purchase_attempt_id,/^[0-9a-f-]{36}$/);
});
test("Plus refuses checkout when the coupon is unconfirmed or the response changed",async()=>{
 const denied=mockPlus({...checkedPlus,state:"not_eligible"});
 assert.match((await denied.api.requestCheckout(plusConfig)).error,/verify the Plus offer/);
 assert.equal(denied.calls.length,3);
 for(const change of [{promo_campaign:null},{processor_entity:"//evil.example"},{checkout_session_id:"bad/session"}]){
  const {api,calls}=mockPlus(checkedPlus,change);
  assert.equal((await api.requestCheckout(plusConfig)).url,undefined);
  assert.equal(calls.length,4);
 }
});
test("config validation",()=>{
 const c=load(); assert.equal(c.validateConfig(config).seats,5);
 for(const seats of [1,101,2.5]) assert.throws(()=>c.validateConfig({...config,seats}));
 assert.throws(()=>c.validateConfig({...config,country:"VNM"}));
});
test("checkout URL allowlist",()=>{
 const c=load(); assert.ok(c.validCheckoutUrl("https://checkout.stripe.com/c/pay/test"));
 for(const url of ["https://evilchatgpt.com/x","https://chatgpt.com.evil.com","http://chatgpt.com","https://user@chatgpt.com","javascript:alert(1)"]) assert.equal(c.validCheckoutUrl(url),null);
});
test("never request outside ChatGPT",async()=>{const c=load({origin:"https://example.org"});assert.match((await c.requestCheckout(config)).error,/Open chatgpt/);});
test("missing session stops checkout",async()=>{let calls=0;const c=load({fetch:async()=>{calls++;return {ok:true,json:async()=>({})}}});assert.match((await c.requestCheckout(config)).error,/Sign in/);assert.equal(calls,1);});
test("successful request preserves checkout payload",async()=>{let calls=0;const c=load({fetch:async(path,options)=>{calls++;if(calls===1)return{ok:true,json:async()=>({accessToken:"mock-token"})};assert.equal(path,"/backend-api/payments/checkout");assert.equal(options.redirect,"error");assert.equal(options.headers.Authorization,"Bearer mock-token");const data=JSON.parse(options.body);assert.equal(data.team_plan_data.seat_quantity,5);assert.equal(data.promo_campaign.promo_campaign_id,"team-1-month-free");return{ok:true,json:async()=>({url:"https://checkout.stripe.com/c/pay/test"})};}});assert.equal((await c.requestCheckout(config)).url,"https://checkout.stripe.com/c/pay/test");assert.equal(calls,2);});
test("declined checkout stops without retry",async()=>{let calls=0;const c=load({fetch:async()=>{calls++;return calls===1?{ok:true,json:async()=>({accessToken:"mock-token"})}:{ok:false,status:403};}});assert.match((await c.requestCheckout(config)).error,/403/);assert.equal(calls,2);});
test("network failure returns safe message",async()=>{const c=load();assert.match((await c.requestCheckout(config)).error,/Request failed/);});

test("accepts OpenAI hosted payment URLs",()=>{
 const c=load();
 assert.equal(c.validCheckoutUrl("https://pay.openai.com/c/pay/test"),"https://pay.openai.com/c/pay/test");
 for(const url of ["https://pay.openai.com.evil.test","https://evil-pay.openai.com","http://pay.openai.com","https://user@pay.openai.com","https://pay.openai.com:444","https://pay.openai.com@evil.test"]) assert.equal(c.validCheckoutUrl(url),null);
});
test("hosted response accepts supported URL fields and skips empty or malformed values",async()=>{
 for(const data of [{url:"https://pay.openai.com/c/pay/test"},{url:" ",stripe_hosted_url:"https://pay.openai.com/c/pay/test"},{url:42,stripe_hosted_url:null,checkout_url:"https://pay.openai.com/c/pay/test"}]){
  let calls=0;
  const c=load({fetch:async()=>++calls===1?{ok:true,json:async()=>({accessToken:"mock-token"})}:{ok:true,json:async()=>data}});
  const result=await c.requestCheckout(config);
  assert.equal(c.validCheckoutUrl(result.url),"https://pay.openai.com/c/pay/test");
  assert.equal(calls,2);
 }
});
test("null or missing hosted URL yields a safe error without another checkout",async()=>{
 for(const data of [null,{}, {url:null}, {url:" "}]) {
  let calls=0;
  const c=load({fetch:async()=>++calls===1?{ok:true,json:async()=>({accessToken:"mock-token"})}:{ok:true,json:async()=>data}});
  assert.match((await c.requestCheckout(config)).error,/No hosted checkout link/);
  assert.equal(calls,2);
 }
});

test("billing-country mismatch returns a specific safe error and never retries",async()=>{
 let calls=0;
 const c=load({fetch:async()=>++calls===1?{ok:true,json:async()=>({accessToken:"mock-token"})}:{ok:false,status:400,json:async()=>({detail:"Billing country must match request country.",secret:"synthetic-private"})}});
 const result=await c.requestCheckout(config);
 assert.equal(result.code,"billing_country_mismatch");assert.match(result.error,/country does not match/);assert.equal(calls,2);
 assert.ok(!JSON.stringify(result).includes("synthetic-private"));
});
test("unrecognized HTTP 400 or malformed body remains a generic failure",async()=>{
 for(const json of [async()=>({detail:"unrelated private error"}),async()=>{throw Error("bad json");}]){
  let calls=0;const c=load({fetch:async()=>++calls===1?{ok:true,json:async()=>({accessToken:"mock-token"})}:{ok:false,status:400,json}});
  const result=await c.requestCheckout(config);assert.equal(result.code,undefined);assert.match(result.error,/HTTP 400/);assert.equal(calls,2);assert.ok(!result.error.includes("private"));
 }
});

test("server total preserves explicit zero and positive values without retry or private fields",async()=>{
 for(const minorUnits of [0,3569500]){
  let calls=0;
  const c=load({fetch:async()=>++calls===1?{ok:true,json:async()=>({accessToken:"mock-token"})}:{ok:true,json:async()=>({url:"https://pay.openai.com/c/pay/test",status:"open",client_secret:"synthetic-private",checkout_state:{currency:"vnd",email:"synthetic-private",total:{total:{minorUnitsAmount:minorUnits}}}})}});
  const result=await c.requestCheckout({...config,currency:"VND"});
  assert.equal(result.total.currency,"VND");assert.equal(result.total.minorUnits,minorUnits);assert.equal(calls,2);
  assert.ok(!JSON.stringify(result).includes("synthetic-private"));
 }
});
test("missing or untrustworthy server totals are not treated as zero",async()=>{
 for(const [status,currency,value] of [["open","vnd",undefined],["open","vnd",null],["open","vnd","0"],["open","vnd",-1],["open","vnd",0.1],["open","usd",0],["complete","vnd",0]]){
  let calls=0;
  const c=load({fetch:async()=>++calls===1?{ok:true,json:async()=>({accessToken:"mock-token"})}:{ok:true,json:async()=>({url:"https://pay.openai.com/c/pay/test",status,checkout_state:{currency,total:{total:{minorUnitsAmount:value}}}})}});
  const result=await c.requestCheckout({...config,currency:"VND"});
  assert.equal(result.total,undefined);assert.ok(result.url);assert.equal(calls,2);
 }
});
