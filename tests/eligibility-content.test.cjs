const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('entrypoints/eligibility.content.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness(check,sendHook=async()=>{}){
 let listener,definition,invalidated;const messages=[];let count=0;
 const win={};win.top=win;
 const browser={runtime:{id:'extension-test',sendMessage:async message=>{messages.push(message);await sendHook(message);},onMessage:{addListener:fn=>{listener=fn;},removeListener:()=>{listener=undefined;}}}};
 const modules={'wxt/utils/define-content-script':{defineContentScript:x=>{definition=x;return x;}},'wxt/browser':{browser},'../utils/eligibility':{checkOfferEligibility:()=>{count++;return check();}},'../utils/eligibility-badge':{BADGE_MESSAGE:'badge',CHECK_TAB_MESSAGE:'check',ELIGIBILITY_RESULT_MESSAGE:'result',ELIGIBILITY_PENDING_MESSAGE:'pending'}};
 vm.runInNewContext(source,{exports:{},window:win,require:name=>{assert.ok(modules[name],name);return modules[name];}});
 definition.main({onInvalidated:fn=>{invalidated=fn;}});
 const request=(force=false)=>new Promise(resolve=>{assert.equal(listener({type:'check',force},{id:'extension-test'},resolve),true);});
 const snapshot=()=>{let value;assert.equal(listener({type:'badge'},{id:'extension-test'},v=>{value=v;}),false);return value;};
 return {request,snapshot,messages,count:()=>count,dispose:()=>invalidated()};
}
const eligible={state:'eligible',plan:'plus',campaign:'assigned',reason:'synthetic'};
test('automatic load and overlapping popup requests share one check; repeated opens reuse result',{timeout:5000},async()=>{
 let finish, signalStarted;
 const started=new Promise(resolve=>{signalStarted=resolve;});
 const h=harness(()=>new Promise(resolve=>{finish=resolve;signalStarted();}));
 const a=h.request(),b=h.request();
 // Wait for the mocked request to actually start, not an assumed number of VM microtasks.
 await started;
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

test('active-tab badge snapshot does not start or repeat eligibility requests',{timeout:5000},async()=>{
 let finish,signalStarted;
 const started=new Promise(resolve=>{signalStarted=resolve;});
 const h=harness(()=>new Promise(resolve=>{finish=resolve;signalStarted();}));
 await started;
 assert.equal(h.snapshot().pending,true);assert.equal(h.count(),1);
 const result=h.request();finish(eligible);await result;
 assert.equal(h.snapshot().pending,false);assert.equal(h.snapshot().result.state,'eligible');
 for(let i=0;i<5;i++)assert.equal(h.snapshot().result.state,'eligible');
 assert.equal(h.count(),1);h.dispose();
});

test('snapshot shows final result while result notification is still in flight',{timeout:5000},async()=>{
 let release,notify;
 const notified=new Promise(resolve=>{notify=resolve;});
 const h=harness(async()=>eligible,async message=>{
  if(message.type==='result')await new Promise(resolve=>{release=resolve;notify();});
 });
 await notified;
 assert.equal(h.snapshot().pending,false);assert.equal(h.snapshot().result.state,'eligible');
 const result=h.request();release();await result;
 assert.equal(h.count(),1);h.dispose();
});
