import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ArrowRight, ArrowLeft, ArrowUpRight, Settings2, Link2, RefreshCw, Minus, Plus, Copy, ExternalLink, Download, UserRound, UsersRound } from 'lucide-react';
import { Input } from './input';
import { Switch } from './switch';
import { Button } from './button';
import { ThemeToggle } from './theme-toggle';
import { initTheme } from './extension-theme';
import { AnimatedBadge, type AnimatedBadgeStatus } from './animated-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Tooltip } from './tooltip';
import { translate, uiLocale } from '../i18n';

const BILLING_SYNC_EVENT = 'offer-toolkit-billing-sync';
export function syncBillingSelects() { document.dispatchEvent(new Event(BILLING_SYNC_EVENT)); }

function billingOptions(id: 'country' | 'currency') {
  if (id === 'currency') return Intl.supportedValuesOf('currency').map(code => ({ code, label: code }));
  const displayNames = new Intl.DisplayNames([uiLocale], { type: 'region', fallback: 'none' });
  const options = [];
  for (const first of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    for (const second of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const code = first + second;
      const name = displayNames.of(code);
      if (name && !['EU','EZ','UN','ZZ','XX'].includes(code)) options.push({ code, label: `${name} (${code})` });
    }
  }
  return options.sort((a,b) => a.label.localeCompare(b.label,uiLocale));
}

function BillingSelect({native,id}:{native:HTMLInputElement;id:'country'|'currency'}) {
  const [options] = useState(() => billingOptions(id));
  const read = () => ({value:native.value,disabled:native.disabled});
  const [state,setState] = useState(read);
  useEffect(() => {
    const sync = () => setState(read());
    const observer = new MutationObserver(sync);
    observer.observe(native,{attributes:true,attributeFilter:['disabled']});
    native.addEventListener('input',sync);
    document.addEventListener(BILLING_SYNC_EVENT,sync);
    sync();
    return () => {
      observer.disconnect();
      native.removeEventListener('input',sync);
      document.removeEventListener(BILLING_SYNC_EVENT,sync);
    };
  },[native]);
  const selected = options.find(option => option.code === state.value);
  return <Select value={state.value} disabled={state.disabled} onValueChange={value => {
    native.value = value;
    native.dispatchEvent(new Event('input',{bubbles:true}));
  }}>
    <SelectTrigger labelId={`${id}-label`} className="h-9 px-2.5 text-xs">
      <SelectValue className="truncate" placeholder={translate(id === 'country' ? 'Select country' : 'Select currency')}/>
    </SelectTrigger>
    <SelectContent>
      {state.value && !selected && <SelectItem value={state.value}>{state.value}</SelectItem>}
      {options.map(({code,label}) => <SelectItem key={code} value={code} className="text-xs">{label}</SelectItem>)}
    </SelectContent>
  </Select>;
}

function Generate({submit}:{submit:()=>void}) {
  const native=document.getElementById('generate') as HTMLButtonElement;
  const label=document.getElementById('generate-label')!;
  const read=()=>({
    disabled:native.disabled,
    label:label.textContent||translate('Generate checkout link'),
    tooltip:native.dataset.tooltip||translate('Create a checkout link with your current settings.'),
  });
  const [value,setValue]=useState(read);
  useEffect(()=>{
    const observer=new MutationObserver(()=>setValue(read()));
    observer.observe(native,{attributes:true,attributeFilter:['disabled','data-tooltip'],childList:true,subtree:true,characterData:true});
    setValue(read());
    return ()=>observer.disconnect();
  },[]);
  return <Tooltip content={value.tooltip}><Button className="w-full rounded-xl justify-between px-4" size="lg" disabled={value.disabled} onClick={()=>{if(!native.disabled)submit()}} pressScale={0.98}>
    <Link2 size={17} aria-hidden="true"/><span className="flex-1">{value.label}</span><ArrowRight size={17} aria-hidden="true"/>
  </Button></Tooltip>;
}
function EligibilityBadge({id}:{id:string}) {
  const node=document.getElementById(id)!;
  const read=()=>({text:node.textContent||translate('Unknown'),state:node.dataset.state});
  const [value,setValue]=useState(read);
  useEffect(()=>{
    const observer=new MutationObserver(()=>setValue(read()));
    observer.observe(node,{attributes:true,attributeFilter:['data-state'],childList:true,subtree:true,characterData:true});
    setValue(read());
    return ()=>observer.disconnect();
  },[node]);
  const status:AnimatedBadgeStatus=value.text===translate('Checking…')?'loading':value.state==='eligible'?'success':value.state==='not_eligible'?'danger':value.state==='redeemed'?'warning':'neutral';
  return <AnimatedBadge status={status} size="sm" pulse={false} aria-hidden="true">{value.text}</AnimatedBadge>;
}
function RefreshEligibility({id}:{id:string}) {
  const native=document.getElementById(id) as HTMLButtonElement;
  const read=()=>({disabled:native.disabled,checking:native.textContent===translate('Checking…')});
  const [value,setValue]=useState(read);
  useEffect(()=>{
    const observer=new MutationObserver(()=>setValue(read()));
    observer.observe(native,{attributes:true,attributeFilter:['disabled'],childList:true,subtree:true,characterData:true});
    setValue(read());
    return ()=>observer.disconnect();
  },[native]);
  const label=translate('Check eligibility again');
  return <Tooltip content={label} side="bottom"><Button variant="ghost" size="icon" disabled={value.disabled}
    aria-label={label}
    onClick={()=>{if(!native.disabled)native.click()}}>
    <RefreshCw size={15} aria-hidden="true" className={value.checking?'animate-spin':undefined}/>
  </Button></Tooltip>;
}
export function mountBeui(submit:()=>void) {
  initTheme();
  const theme=document.getElementById('beui-theme')!;
  const cta=document.getElementById('beui-generate')!;
  const eligibility=document.getElementById('beui-eligibility')!;
  const refresh=document.getElementById('beui-refresh')!;
  flushSync(()=>{
    createRoot(theme).render(<ThemeToggle variant="circle" start="top-right" className="rounded-xl border border-border bg-background p-2" iconClassName="size-4"/>);
    createRoot(cta).render(<Generate submit={submit}/>);
    createRoot(eligibility).render(<EligibilityBadge id="eligibility-state"/>);
    createRoot(refresh).render(<RefreshEligibility id="eligibility-check"/>);
    createRoot(document.getElementById('beui-plus-eligibility')!).render(<EligibilityBadge id="plus-eligibility-state"/>);
  });
}

const buttonSpecs = {
  'plan-business': {icon:UsersRound, variant:'ghost', size:'sm'},
  'plan-personal': {icon:UserRound, variant:'ghost', size:'sm'},
  'plus-pricing': {icon:ExternalLink, variant:'ghost', size:'sm', tooltip:'Open the official ChatGPT pricing page.'},
  'view-offer': {icon:ArrowLeft, variant:'ghost', size:'icon'},
  'view-settings': {icon:Settings2, variant:'outline', size:'icon'},
  'official': {icon:ArrowUpRight, variant:'ghost', size:'sm', tooltip:'Open the official ChatGPT offer page.'},
  'minus': {icon:Minus, variant:'outline', size:'icon'},
  'plus': {icon:Plus, variant:'outline', size:'icon'},
  'copy': {icon:Copy, variant:'outline', size:'md', tooltip:'Copy the checkout link to your clipboard.'},
  'open': {icon:ExternalLink, variant:'primary', size:'md', tooltip:'Open the checkout link in a new tab.'},
  'price-check': {icon:RefreshCw, variant:'outline', size:'md', tooltip:'Read the amount due today on the current checkout page.'},
  'update-check': {icon:RefreshCw, variant:'outline', size:'md', tooltip:'Check GitHub for a newer version.'},
  'update-download': {icon:Download, variant:'primary', size:'md', tooltip:'Open the GitHub release and its downloads.'},
  'github': {icon:ArrowUpRight, variant:'ghost', size:'sm', tooltip:'Open the project on GitHub.'},
  'telegram': {icon:ArrowUpRight, variant:'ghost', size:'sm', tooltip:'Open support on Telegram.'},
  'eplus': {icon:ArrowUpRight, variant:'ghost', size:'sm', tooltip:'Visit ePlus.DEV.'},
} as const;
function NativeAction({native,id,host}:{native:HTMLButtonElement;id:keyof typeof buttonSpecs;host:HTMLElement}){
  const spec=buttonSpecs[id];
  const Icon=spec.icon;
  const read=()=>({disabled:native.disabled,hidden:native.hidden,label:(native.textContent||'').replace(/↗/g,'').trim(),pressed:native.getAttribute('aria-pressed'),dot:id==='view-settings'&&!document.getElementById('nav-update-dot')?.hidden});
  const [state,setState]=useState(read);
  useEffect(()=>{
    const sync=()=>{host.hidden=native.hidden;setState(read());};
    const obs=new MutationObserver(sync);
    obs.observe(native,{attributes:true,childList:true,characterData:true,subtree:true});
    sync();return ()=>obs.disconnect();
  },[]);
  const onlyIcon=spec.size==='icon';
  const label=native.getAttribute('aria-label')||state.label;
  const offerLink=id==='official'||id==='plus-pricing';
  const action=<Button variant={spec.variant} size={spec.size} className={onlyIcon?'relative size-8 rounded-lg':offerLink?'h-7 gap-1 px-1 text-primary':id==='github'||id==='telegram'||id==='eplus'?'h-7 gap-1 px-1 text-[10px]':'w-full rounded-lg'} disabled={state.disabled}
    aria-label={label} aria-controls={native.getAttribute('aria-controls')||undefined} aria-pressed={state.pressed===null?undefined:state.pressed==='true'}
    onClick={()=>{if(!native.disabled&&!native.hidden)native.click()}}>
    {!onlyIcon&&<span>{state.label}</span>}<Icon size={onlyIcon?17:13} aria-hidden="true"/>
    {state.dot&&<span className="absolute right-0 top-0 size-2 rounded-full bg-primary" aria-label={translate('Update available')}/>}
  </Button>;
  const content=native.dataset.tooltip||('tooltip' in spec ? translate(spec.tooltip) : label);
  return <Tooltip content={content} side={onlyIcon || offerLink ? 'bottom' : 'top'}>{action}</Tooltip>;
}
const SWITCH_EVENT='offer-toolkit-switch-sync';
export function syncBeuiSwitches(){document.dispatchEvent(new Event(SWITCH_EVENT));}
function NativeSwitch({native,label}:{native:HTMLInputElement;label:string}){
  const read=()=>({checked:native.checked,disabled:native.disabled});
  const [state,setState]=useState(read);
  useEffect(()=>{
    const sync=()=>setState(read());
    const obs=new MutationObserver(sync);obs.observe(native,{attributes:true,attributeFilter:['disabled','checked']});
    native.addEventListener('change',sync);document.addEventListener(SWITCH_EVENT,sync);sync();
    return ()=>{obs.disconnect();native.removeEventListener('change',sync);document.removeEventListener(SWITCH_EVENT,sync);};
  },[]);
  return <Switch checked={state.checked} disabled={state.disabled} ariaLabel={label} onCheckedChange={next=>{if(!native.disabled&&next!==native.checked)native.click()}}/>;
}
export function enhanceFormControls(){
  // Actual beUI inputs retain native form validation, IDs and DOM value ownership.
  for(const id of ['workspace','seats','link']){
    const native=document.getElementById(id) as HTMLInputElement;
    const props={id,type:native.type,defaultValue:native.value,required:native.required,readOnly:native.readOnly,disabled:native.disabled,maxLength:native.maxLength>=0?native.maxLength:undefined,min:native.min||undefined,max:native.max||undefined,step:native.step||undefined,pattern:native.pattern||undefined,list:native.getAttribute('list')||undefined,placeholder:native.placeholder,autoComplete:native.autocomplete||undefined,inputMode:(native.inputMode||undefined) as React.InputHTMLAttributes<HTMLInputElement>['inputMode']};
    const host=document.createElement('div');host.className='beui-field';native.replaceWith(host);
    flushSync(()=>createRoot(host).render(<Input nativeUncontrolled {...props} classNames={{field:'h-9 rounded-lg',input:'text-xs'}}/>));
  }
  for(const id of ['country','currency'] as const){
    const native=document.getElementById(id) as HTMLInputElement;
    const host=document.createElement('div');
    native.after(host);
    native.classList.add('beui-native');
    native.addEventListener('invalid',event=>event.preventDefault());
    flushSync(()=>createRoot(host).render(<BillingSelect native={native} id={id}/>));
  }
  for(const id of Object.keys(buttonSpecs) as (keyof typeof buttonSpecs)[]){
    const native=document.getElementById(id) as HTMLButtonElement;
    const host=document.createElement('span');host.className='beui-action';host.hidden=native.hidden;native.after(host);native.classList.add('beui-native');
    flushSync(()=>createRoot(host).render(<NativeAction id={id} native={native} host={host}/>));
  }
  for(const [id,label] of [['remember-billing','Remember billing after link succeeds'],['update-auto','Automatically check for updates']] as const){
    const native=document.getElementById(id) as HTMLInputElement;
    const host=document.createElement('span');native.after(host);native.classList.add('beui-native');
    flushSync(()=>createRoot(host).render(<NativeSwitch native={native} label={translate(label)}/>));
  }
}
