const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('utils/checkout-price.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function review(pairs=[],origin='https://chatgpt.com',pathname='/checkout/example'){
 const elements=[];
 for(const [label,amount] of pairs){
  const value={textContent:amount,childElementCount:0,closest:()=>null,querySelector:()=>null,getClientRects:()=>[{}],nextElementSibling:null,parentElement:null};
  elements.push({textContent:label,childElementCount:0,closest:()=>null,getClientRects:()=>[{}],nextElementSibling:value,parentElement:null},value);
 }
 let reads=0;const ctx=vm.createContext({exports:{},location:{origin,pathname},document:{querySelectorAll:()=>{reads++;return elements;}},getComputedStyle:()=>({visibility:'visible',display:'block'})});
 vm.runInContext(source,ctx);return {result:ctx.exports.reviewCheckoutPrice(),reads};
}
test('explicit due-now zero and positive amounts remain distinct',()=>{
 assert.equal(review([['Total due today','0 ₫']]).result.state,'zero');
 assert.equal(review([['Total due today','3.569.500 VND']]).result.state,'paid');
 assert.equal(review([['Amount due today','$0.00']]).result.state,'zero');
});
test('subtotal, ambiguous or conflicting total stays unknown',()=>{
 assert.equal(review([['Subtotal','0 ₫']]).result.state,'unknown');
 assert.equal(review([['Total due today','0']]).result.state,'unknown');
 assert.equal(review([['Total due today','0 ₫'],['Total due today','500 ₫']]).result.state,'unknown');
});
test('never inspect unrelated sites or normal chat pages',()=>{
 for(const [origin,path] of [['https://example.com','/checkout/x'],['https://pay.openai.com','/checkout/x'],['https://checkout.stripe.com','/checkout/x'],['https://chatgpt.com','/c/x']]){
  const v=review([['Total due today','0 ₫']],origin,path);assert.equal(v.result.state,'unknown');assert.equal(v.reads,0);
 }
});
