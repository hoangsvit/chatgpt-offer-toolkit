import { browser } from 'wxt/browser';
import { validateConfig, validCheckoutUrl, requestCheckout } from '../../utils/checkout';
import type { CheckoutConfig, CheckoutResult } from '../../utils/checkout';
import './style.css';

const inputIds = ['workspace','seats','country','currency','link'] as const;
type InputId = typeof inputIds[number];
type ButtonId = 'generate' | 'copy' | 'open' | 'official';
function $(id: InputId): HTMLInputElement;
function $(id: ButtonId): HTMLButtonElement;
function $(id: 'settings'): HTMLFormElement;
function $(id: 'status' | 'result'): HTMLElement;
function $(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error('Missing UI element: ' + id);
  return element;
}
let currentUrl: string | null = null;
const status = (message: string) => { $("status").textContent = message; };
function resetResult(){ currentUrl = null; $("link").value = ""; $("result").hidden = true; }
$("settings").addEventListener("submit",async event => {
  event.preventDefault(); resetResult();
  let config: CheckoutConfig;
  try { config = validateConfig({workspace:$("workspace").value,seats:$("seats").value,country:$("country").value,currency:$("currency").value}); }
  catch(error){ status(error instanceof Error ? error.message : 'Invalid settings.'); return; }
  $("generate").disabled = true;
  status("Requesting checkout from your current ChatGPT session…");
  try {
    const [tab] = await browser.tabs.query({active:true,currentWindow:true});
    if (!tab?.id || !tab.url || new URL(tab.url).origin !== "https://chatgpt.com") {status("Open chatgpt.com, sign in, and reopen this extension."); return;}
    const [response] = await browser.scripting.executeScript({target:{tabId:tab.id},func:requestCheckout,args:[config]});
    const result = response?.result as CheckoutResult | undefined;
    if (!result?.url) {status(result?.error || "No checkout response received."); return;}
    currentUrl = validCheckoutUrl(result.url);
    if (!currentUrl) {status("Unexpected checkout URL blocked."); return;}
    $("link").value = currentUrl; $("result").hidden = false;
    status("Link generated. This does not confirm a free offer. Review the official checkout.");
  } catch {status("Unable to access the ChatGPT tab. Reopen the extension and try again.");}
  finally {$("generate").disabled = false;}
});
$("copy").addEventListener("click",async()=>{if(!currentUrl)return;try{await navigator.clipboard.writeText(currentUrl);status("Link copied. Keep it private.");}catch{$("link").select();status("Select and copy the link manually.");}});
$("open").addEventListener("click",()=>{if(currentUrl)void browser.tabs.create({url:currentUrl}).catch(()=>status('Unable to open checkout.'));});
$("official").addEventListener("click",()=>{void browser.tabs.create({url:"https://chatgpt.com/?promo_campaign=team-1-month-free#pricing"}).catch(()=>status("Unable to open offer page."));});
