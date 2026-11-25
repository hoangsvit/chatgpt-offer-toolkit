const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const source = fs.readFileSync("extension/checkout.js","utf8");
function load({origin="https://chatgpt.com",fetch=async()=>{throw Error("unexpected request")}}={}){
  const ctx=vm.createContext({URL,location:{origin},fetch});
  vm.runInContext(source,ctx);
  return ctx;
}
const config={workspace:"MyTeam",seats:5,country:"VN",currency:"USD"};
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
