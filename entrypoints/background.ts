import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { RELEASE_API, UPDATE_KEY, AUTO_KEY, CHECK_MESSAGE, AUTO_CHECK_MESSAGE, ALARM_NAME, normalizeUpdate, releaseVersion, shouldAutoCheck } from '../utils/updates';
import type { UpdateState } from '../utils/updates';
import { BADGE_MESSAGE, badgeFor, CHECK_POPUP_MESSAGE, CHECK_TAB_MESSAGE, isChatGPTUrl, ELIGIBILITY_PENDING_MESSAGE, ELIGIBILITY_RESULT_MESSAGE } from '../utils/eligibility-badge';
import { checkOfferEligibility } from '../utils/eligibility';
import type { EligibilityResult } from '../utils/eligibility';

export default defineBackground(() => {
  let pending: Promise<UpdateState> | null = null;
  function check(): Promise<UpdateState> {
    if(pending) return pending;
    pending = (async () => {
      const data = await browser.storage.local.get(UPDATE_KEY);
      const previous = normalizeUpdate(data[UPDATE_KEY]);
      let next: UpdateState;
      try {
        const response = await fetch(RELEASE_API, {credentials:'omit',cache:'no-store',redirect:'error',headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
        if(response.status === 404) next = {latest:null,checkedAt:Date.now(),error:null};
        else {
          if(!response.ok) throw new Error('GitHub returned HTTP '+response.status);
          const latest = releaseVersion(await response.json());
          if(!latest) throw new Error('Invalid stable release metadata');
          next = {latest,checkedAt:Date.now(),error:null};
        }
      } catch {
        next = {...previous,checkedAt:Date.now(),error:'Unable to check GitHub Releases. Try again later.'};
      }
      await browser.storage.local.set({[UPDATE_KEY]:next});
      return next;
    })().finally(()=>{pending=null;});
    return pending;
  }
  async function configure() {
    const data = await browser.storage.local.get([AUTO_KEY,UPDATE_KEY]);
    if(data[AUTO_KEY] === false) {await browser.alarms.clear(ALARM_NAME);return;}
    if(!await browser.alarms.get(ALARM_NAME)) await browser.alarms.create(ALARM_NAME,{periodInMinutes:360});
    if(Date.now()-normalizeUpdate(data[UPDATE_KEY]).checkedAt >= 21600000) await checkIfDue();
  }
  let autoPending: Promise<UpdateState> | null = null;
  function checkIfDue(): Promise<UpdateState> {
    if(autoPending) return autoPending;
    autoPending=(async()=>{
      const data=await browser.storage.local.get([AUTO_KEY,UPDATE_KEY]);
      const previous=normalizeUpdate(data[UPDATE_KEY]);
      return shouldAutoCheck(data[AUTO_KEY],previous.checkedAt) ? check() : previous;
    })().finally(()=>{autoPending=null;});
    return autoPending;
  }
  browser.runtime.onMessage.addListener((message,sender,sendResponse)=>{
    if(message!==AUTO_CHECK_MESSAGE || sender.id!==browser.runtime.id) return false;
    if(sender.tab && (sender.frameId!==0 || !isChatGPTUrl(sender.url))) return false;
    void checkIfDue().then(sendResponse,()=>sendResponse({latest:null,checkedAt:Date.now(),error:'Unable to check for updates.'}));
    return true;
  });
  function run(task: Promise<unknown>) {void task.catch(()=>{});}
  browser.runtime.onInstalled.addListener(()=>run(configure()));
  browser.runtime.onStartup.addListener(()=>run(configure()));
  browser.alarms.onAlarm.addListener(alarm=>{if(alarm.name===ALARM_NAME)run(checkIfDue());});
  browser.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[AUTO_KEY])run(configure());});
  browser.runtime.onMessage.addListener((message,sender,sendResponse)=>{
    if(message !== CHECK_MESSAGE || sender.id !== browser.runtime.id || sender.tab) return false;
    void check().then(sendResponse,()=>sendResponse({latest:null,checkedAt:Date.now(),error:'Unable to check for updates.'}));
    return true;
  });
  // Toolbar badges are per-tab; never use a global account result or persist it.
  type FallbackCheck = {pending?: Promise<EligibilityResult | undefined>; result?: EligibilityResult};
  const revision = new Map<number, symbol>();
  const fallbackChecks = new Map<number, FallbackCheck>();
  const queues = new Map<number, Promise<unknown>>();
  const writes = new Map<number, number>();
  function tabRevision(tabId: number) {
    const version = revision.get(tabId) ?? Symbol();
    revision.set(tabId,version);
    return version;
  }
  function paint(tabId: number, text: string, color: string, title: string) {
    writes.set(tabId,(writes.get(tabId)??0)+1);
    const next = (queues.get(tabId) ?? Promise.resolve()).catch(()=>{}).then(async()=>{
      await browser.action.setBadgeBackgroundColor({tabId,color});
      await browser.action.setBadgeText({tabId,text});
      await browser.action.setTitle({tabId,title:'ChatGPT Offer Toolkit — '+title});
    });
    queues.set(tabId,next);
    void next.finally(()=>{if(queues.get(tabId)===next)queues.delete(tabId);}).catch(()=>{});
  }
  const offBadge = {text:'OFF',color:'#64736b',title:'Inactive — only works on chatgpt.com'};
  const checkingBadge = {text:'…',color:'#64736b',title:'Checking offer eligibility'};
  function paintEligibility(tabId: number, result: unknown, checking = false) {
    const {text,color,title} = checking ? checkingBadge : badgeFor(result);
    paint(tabId,text,color,title);
  }
  async function defaultBadge() {
    await browser.action.setBadgeBackgroundColor({color:offBadge.color});
    await browser.action.setBadgeText({text:offBadge.text});
    await browser.action.setTitle({title:'ChatGPT Offer Toolkit — '+offBadge.title});
  }
  function clear(tabId: number, url: unknown) {
    revision.set(tabId,Symbol());
    fallbackChecks.delete(tabId);
    const badge = isChatGPTUrl(url) ? {text:'…',color:'#64736b',title:'Waiting for ChatGPT page checker'} : offBadge;
    paint(tabId,badge.text,badge.color,badge.title);
  }
  browser.tabs.onUpdated.addListener((tabId,change,tab)=>{
    if(change.status==='loading' || (change.url && !isChatGPTUrl(change.url))) clear(tabId,change.url ?? tab.url);
  });
  async function syncActiveBadge(tabId: number) {
    const version=tabRevision(tabId);
    const write= writes.get(tabId)??0;
    const current=()=> revision.get(tabId)===version && (writes.get(tabId)??0)===write;
    const tab=await browser.tabs.get(tabId);
    if (!current()) return;
    if (!isChatGPTUrl(tab.url)) {
      paint(tabId,offBadge.text,offBadge.color,offBadge.title);
      return;
    }
    let snapshot: {pending?:boolean;result?:unknown}|undefined;
    try {
      snapshot=await browser.tabs.sendMessage(tabId,{type:BADGE_MESSAGE},{frameId:0});
    } catch { /* The checker may not be present in a tab opened before installation. */ }
    if (!current()) return;
    const state = snapshot ?? fallbackChecks.get(tabId);
    paintEligibility(tabId,state?.result,Boolean(state?.pending));
  }
  async function checkFromPopup(tabId: number, force: boolean): Promise<EligibilityResult | undefined> {
    const version = tabRevision(tabId);
    const tab = await browser.tabs.get(tabId);
    if (revision.get(tabId) !== version || !isChatGPTUrl(tab.url)) return;

    const result = await browser.tabs.sendMessage(tabId,{type:CHECK_TAB_MESSAGE,force},{frameId:0})
      .catch(() => undefined) as EligibilityResult | undefined;
    if (revision.get(tabId) !== version) return;
    if (result) {
      fallbackChecks.delete(tabId);
      paintEligibility(tabId,result);
      return result;
    }

    const cached = fallbackChecks.get(tabId);
    if (cached?.pending) return cached.pending;
    if (!force && cached?.result) {
      paintEligibility(tabId,cached.result);
      return cached.result;
    }

    const entry: FallbackCheck = {};
    fallbackChecks.set(tabId,entry);
    paintEligibility(tabId,undefined,true);
    entry.pending = (async () => {
      const unknown: EligibilityResult = {state:'unknown',plan:null,campaign:'unknown',reason:'Unable to access the ChatGPT session. Use Check again to retry.'};
      let checked: EligibilityResult | undefined;
      try {
        // The extension's default cookie store can differ from a private or container tab.
        const defaultSession = !tab.incognito && (!import.meta.env.FIREFOX ||
          ('cookieStoreId' in tab && tab.cookieStoreId === 'firefox-default'));
        if (defaultSession) {
          checked = await checkOfferEligibility('extension');
        } else {
          const [response] = await browser.scripting.executeScript({target:{tabId},func:checkOfferEligibility});
          checked = response?.result;
        }
      } catch { /* Report an unavailable session in both the popup and badge. */ }
      if (revision.get(tabId) !== version || fallbackChecks.get(tabId) !== entry) return;
      entry.result = checked ?? unknown;
      paintEligibility(tabId,entry.result);
      return entry.result;
    })().finally(() => { entry.pending = undefined; });
    return entry.pending;
  }
  async function syncFocusedTab() {
    const tabs=await browser.tabs.query({active:true,lastFocusedWindow:true});
    if(tabs[0]?.id!=null) await syncActiveBadge(tabs[0].id);
  }
  browser.tabs.onActivated.addListener(({tabId})=>run(syncActiveBadge(tabId)));
  browser.windows.onFocusChanged.addListener(windowId=>{
    if(windowId!==browser.windows.WINDOW_ID_NONE) run(syncFocusedTab());
  });
  async function initializeBadge() {
    await defaultBadge();
    await syncFocusedTab();
  }
  browser.runtime.onInstalled.addListener(()=>run(initializeBadge()));
  browser.runtime.onStartup.addListener(()=>run(initializeBadge()));
  run(initializeBadge());
  browser.tabs.onRemoved.addListener(tabId=>{
    revision.delete(tabId);
    fallbackChecks.delete(tabId);
    queues.delete(tabId);
    writes.delete(tabId);
  });
  browser.runtime.onMessage.addListener((message,sender,sendResponse)=>{
    if (sender.id !== browser.runtime.id || sender.tab || message?.type !== CHECK_POPUP_MESSAGE || !Number.isInteger(message.tabId)) return false;
    void checkFromPopup(message.tabId,message.force === true).then(sendResponse,()=>sendResponse(undefined));
    return true;
  });
  browser.runtime.onMessage.addListener((message,sender,sendResponse)=>{
    if(sender.id!==browser.runtime.id || sender.frameId!==0 || sender.tab?.id==null || !isChatGPTUrl(sender.url)) return false;
    if(message?.type!==ELIGIBILITY_PENDING_MESSAGE && message?.type!==ELIGIBILITY_RESULT_MESSAGE) return false;
    const tabId=sender.tab.id;
    const version=tabRevision(tabId);
    void (async()=>{
      const tab=await browser.tabs.get(tabId);
      if(!isChatGPTUrl(tab.url ?? sender.tab?.url) || revision.get(tabId)!==version) return;
      paintEligibility(tabId,message.result,message.type===ELIGIBILITY_PENDING_MESSAGE);
    })().then(()=>sendResponse(true),()=>sendResponse(false));
    return true;
  });
  run(configure());
});
