const $ = id => document.getElementById(id);
let currentUrl = null;
const status = message => { $("status").textContent = message; };
function resetResult(){ currentUrl = null; $("link").value = ""; $("result").hidden = true; }
$("settings").addEventListener("submit",async event => {
  event.preventDefault(); resetResult();
  let config;
  try { config = validateConfig({workspace:$("workspace").value,seats:$("seats").value,country:$("country").value,currency:$("currency").value}); }
  catch(error){ status(error.message); return; }
  $("generate").disabled = true;
  status("Requesting checkout from your current ChatGPT session…");
  try {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    if (!tab?.id || !tab.url || new URL(tab.url).origin !== "https://chatgpt.com") {status("Open chatgpt.com, sign in, and reopen this extension."); return;}
    const [response] = await chrome.scripting.executeScript({target:{tabId:tab.id},func:requestCheckout,args:[config]});
    const result = response?.result;
    if (!result?.url) {status(result?.error || "No checkout response received."); return;}
    currentUrl = validCheckoutUrl(result.url);
    if (!currentUrl) {status("Unexpected checkout URL blocked."); return;}
    $("link").value = currentUrl; $("result").hidden = false;
    status("Link generated. This does not confirm a free offer. Review the official checkout.");
  } catch {status("Unable to access the ChatGPT tab. Reopen the extension and try again.");}
  finally {$("generate").disabled = false;}
});
$("copy").addEventListener("click",async()=>{if(!currentUrl)return;try{await navigator.clipboard.writeText(currentUrl);status("Link copied. Keep it private.");}catch{$("link").select();status("Select and copy the link manually.");}});
$("open").addEventListener("click",()=>{if(currentUrl)chrome.tabs.create({url:currentUrl});});
$("official").addEventListener("click",()=>chrome.tabs.create({url:"https://chatgpt.com/?promo_campaign=team-1-month-free#pricing"}));
