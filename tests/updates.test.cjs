const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const ctx=vm.createContext({exports:{},Number});
vm.runInContext(ts.transpileModule(fs.readFileSync('utils/updates.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);
const u=ctx.exports;
test('numeric stable versions',()=>{assert.equal(u.isNewer('v1.10.0','1.9.9'),true);assert.equal(u.isNewer('1.4.0','1.4.0'),false);assert.equal(u.isNewer('1.3.9','1.4.0'),false);});
test('reject malformed or prerelease versions',()=>{for(const v of ['v1.4.1-beta','1.4','https://evil.test','01.2.3',null])assert.equal(u.isNewer(v,'1.3.0'),false);});
test('stable public release only',()=>{assert.equal(u.releaseVersion({tag_name:'v1.4.0',draft:false,prerelease:false}),'1.4.0');assert.equal(u.releaseVersion({tag_name:'v1.4.0',draft:false,prerelease:true}),null);});
test('links never use arbitrary API URLs',()=>{assert.equal(u.releasePage('https://evil.test'),u.RELEASES_URL);assert.equal(u.releasePage('1.4.0'),u.RELEASES_URL+'/tag/v1.4.0');});
test('invalid cached metadata ignored',()=>{assert.equal(u.normalizeUpdate({latest:'bad',checkedAt:-1}).latest,null);assert.equal(u.normalizeUpdate({checkedAt:-1}).checkedAt,0);});

test('page update checks are throttled and respect opt-out',()=>{const now=10000000;assert.equal(u.shouldAutoCheck(false,0,now),false);assert.equal(u.shouldAutoCheck(true,0,now),true);assert.equal(u.shouldAutoCheck(undefined,now-899999,now),false);assert.equal(u.shouldAutoCheck(true,now-900000,now),true);assert.equal(u.shouldAutoCheck(true,now+1,now),true);});
