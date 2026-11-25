import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { RELEASE_API, UPDATE_KEY, AUTO_KEY, CHECK_MESSAGE, AUTO_CHECK_MESSAGE, ALARM_NAME, normalizeUpdate, releaseVersion, shouldAutoCheck } from '../utils/updates';
import type { UpdateState } from '../utils/updates';
import { badgeFor, isChatGPTUrl, ELIGIBILITY_PENDING_MESSAGE, ELIGIBILITY_RESULT_MESSAGE } from '../utils/eligibility-badge';

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
  const revision = new Map<number, number>();
  const queues = new Map<number, Promise<unknown>>();
  function paint(tabId: number, text: string, color: string, title: string) {
    const next = (queues.get(tabId) ?? Promise.resolve()).catch(()=>{}).then(async()=>{
      await browser.action.setBadgeBackgroundColor({tabId,color});
      await browser.action.setBadgeText({tabId,text});
      await browser.action.setTitle({tabId,title:'ChatGPT Offer Toolkit — '+title});
    });
    queues.set(tabId,next);
    void next.finally(()=>{if(queues.get(tabId)===next)queues.delete(tabId);}).catch(()=>{});
  }
  const offBadge = {text:'OFF',color:'#64736b',title:'Inactive — only works on chatgpt.com'};
  async function defaultBadge() {
    await browser.action.setBadgeBackgroundColor({color:offBadge.color});
    await browser.action.setBadgeText({text:offBadge.text});
    await browser.action.setTitle({title:'ChatGPT Offer Toolkit — '+offBadge.title});
  }
  function clear(tabId: number, url: unknown) {
    revision.set(tabId,(revision.get(tabId)??0)+1);
    const badge = isChatGPTUrl(url) ? {text:'',color:'#64736b',title:'Offer eligibility not checked'} : offBadge;
    paint(tabId,badge.text,badge.color,badge.title);
  }
  browser.tabs.onUpdated.addListener((tabId,change,tab)=>{
    if(change.status==='loading' || (change.url && !isChatGPTUrl(change.url))) clear(tabId,change.url ?? tab.url);
  });
  browser.runtime.onInstalled.addListener(()=>run(defaultBadge()));
  browser.runtime.onStartup.addListener(()=>run(defaultBadge()));
  run(defaultBadge());
  browser.tabs.onRemoved.addListener(tabId=>{revision.delete(tabId);queues.delete(tabId);});
  browser.runtime.onMessage.addListener((message,sender,sendResponse)=>{
    if(sender.id!==browser.runtime.id || sender.frameId!==0 || sender.tab?.id==null || !isChatGPTUrl(sender.url)) return false;
    if(message?.type!==ELIGIBILITY_PENDING_MESSAGE && message?.type!==ELIGIBILITY_RESULT_MESSAGE) return false;
    const tabId=sender.tab.id;
    const version=revision.get(tabId)??0;
    void (async()=>{
      const tab=await browser.tabs.get(tabId);
      if(!isChatGPTUrl(tab.url ?? sender.tab?.url) || (revision.get(tabId)??0)!==version) return;
      const badge=message.type===ELIGIBILITY_PENDING_MESSAGE
        ? {text:'…',color:'#64736b',title:'Checking offer eligibility'}
        : badgeFor(message.result);
      paint(tabId,badge.text,badge.color,badge.title);
    })().then(()=>sendResponse(true),()=>sendResponse(false));
    return true;
  });
  run(configure());
});
