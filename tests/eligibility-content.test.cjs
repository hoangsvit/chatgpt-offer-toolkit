const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('entrypoints/eligibility.content.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness(check){
 let listener,definition,invalidated;const messages=[];let count=0;
 const win={};win.top=win;
 const browser={runtime:{id:'extension-test',sendMessage:async message=>{messages.push(message);},onMessage:{addListener:fn=>{listener=fn;},removeListener:()=>{listener=undefined;}}}};
 const modules={'wxt/utils/define-content-script':{defineContentScript:x=>{definition=x;return x;}},'wxt/browser':{browser},'../utils/eligibility':{checkOfferEligibility:()=>{count++;return check();}},'../utils/eligibility-badge':{CHECK_TAB_MESSAGE:'check',ELIGIBILITY_RESULT_MESSAGE:'result',ELIGIBILITY_PENDING_MESSAGE:'pending'}};
 vm.runInNewContext(source,{exports:{},window:win,require:name=>{assert.ok(modules[name],name);return modules[name];}});
 definition.main({onInvalidated:fn=>{invalidated=fn;}});
 const request=(force=false)=>new Promise(resolve=>{assert.equal(listener({type:'check',force},{id:'extension-test'},resolve),true);});
 return {request,messages,count:()=>count,dispose:()=>invalidated()};
}
const eligible={state:'eligible',plan:'plus',campaign:'assigned',reason:'synthetic'};
test('automatic load and overlapping popup requests share one check; repeated opens reuse result',async()=>{
 let finish;const h=harness(()=>new Promise(resolve=>{finish=resolve;}));
 const a=h.request(),b=h.request();
 await Promise.resolve();await Promise.resolve();
 assert.equal(h.count(),1);finish(eligible);
 assert.equal((await a).state,'eligible');await b;
 assert.equal((await h.request()).state,'eligible');assert.equal(h.count(),1);
 assert.equal(h.messages.filter(m=>m.type==='pending').length,1);h.dispose();
});
test('unknown results remain cached and only explicit retry starts a second request',async()=>{
 const h=harness(()=>Promise.reject(new Error('synthetic failure')));
 assert.equal((await h.request()).state,'unknown');
 assert.equal((await h.request()).state,'unknown');assert.equal(h.count(),1);
 assert.equal((await h.request(true)).state,'unknown');assert.equal(h.count(),2);h.dispose();
});
test('explicit refresh is coalesced and fresh documents get their own check',async()=>{
 const a=harness(async()=>eligible);await a.request();await Promise.all([a.request(true),a.request(true)]);
 assert.equal(a.count(),2);const b=harness(async()=>eligible);await b.request();assert.equal(b.count(),1);a.dispose();b.dispose();
});
