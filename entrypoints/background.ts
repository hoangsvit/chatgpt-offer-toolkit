import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { RELEASE_API, UPDATE_KEY, AUTO_KEY, CHECK_MESSAGE, ALARM_NAME, normalizeUpdate, releaseVersion } from '../utils/updates';
import type { UpdateState } from '../utils/updates';

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
    if(Date.now()-normalizeUpdate(data[UPDATE_KEY]).checkedAt >= 21600000) await check();
  }
  function run(task: Promise<unknown>) {void task.catch(()=>{});}
  browser.runtime.onInstalled.addListener(()=>run(configure()));
  browser.runtime.onStartup.addListener(()=>run(configure()));
  browser.alarms.onAlarm.addListener(alarm=>{if(alarm.name===ALARM_NAME)run((async()=>{const s=await browser.storage.local.get(AUTO_KEY);if(s[AUTO_KEY]!==false)await check();})());});
  browser.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[AUTO_KEY])run(configure());});
  browser.runtime.onMessage.addListener((message,sender,sendResponse)=>{
    if(message !== CHECK_MESSAGE || sender.id !== browser.runtime.id || sender.tab) return false;
    void check().then(sendResponse,()=>sendResponse({latest:null,checkedAt:Date.now(),error:'Unable to check for updates.'}));
    return true;
  });
  run(configure());
});
