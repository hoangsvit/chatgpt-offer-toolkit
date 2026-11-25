import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ArrowRight, Link2 } from 'lucide-react';
import { Button } from './button';
import { AnimatedBadge, type AnimatedBadgeStatus } from './animated-badge';

function Generate({submit}:{submit:()=>void}) {
  const native=document.getElementById('generate') as HTMLButtonElement;
  const label=document.getElementById('generate-label')!;
  const read=()=>({disabled:native.disabled,label:label.textContent||'Generate checkout'});
  const [value,setValue]=useState(read);
  useEffect(()=>{
    const observer=new MutationObserver(()=>setValue(read()));
    observer.observe(native,{attributes:true,attributeFilter:['disabled'],childList:true,subtree:true,characterData:true});
    setValue(read());
    return ()=>observer.disconnect();
  },[]);
  return <Button className="w-full rounded-xl justify-between px-4" size="lg" disabled={value.disabled} onClick={()=>{if(!native.disabled)submit()}} pressScale={0.98}>
    <Link2 size={17} aria-hidden="true"/><span className="flex-1">{value.label}</span><ArrowRight size={17} aria-hidden="true"/>
  </Button>;
}
function EligibilityBadge() {
  const node=document.getElementById('eligibility-state')!;
  const read=()=>({text:node.textContent||'Unknown',state:node.dataset.state});
  const [value,setValue]=useState(read);
  useEffect(()=>{
    const observer=new MutationObserver(()=>setValue(read()));
    observer.observe(node,{attributes:true,attributeFilter:['data-state'],childList:true,subtree:true,characterData:true});
    setValue(read());
    return ()=>observer.disconnect();
  },[]);
  const status:AnimatedBadgeStatus=value.text==='Checking…'?'loading':value.state==='eligible'?'success':value.state==='not_eligible'?'danger':value.state==='redeemed'?'warning':'neutral';
  return <AnimatedBadge status={status} size="sm" pulse={false} aria-hidden="true">{value.text}</AnimatedBadge>;
}
export function mountBeui(submit:()=>void) {
  const cta=document.getElementById('beui-generate')!;
  const eligibility=document.getElementById('beui-eligibility')!;
  flushSync(()=>{createRoot(cta).render(<Generate submit={submit}/>);createRoot(eligibility).render(<EligibilityBadge/>);});
}
