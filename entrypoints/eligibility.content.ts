import { defineContentScript } from 'wxt/utils/define-content-script';
import { browser } from 'wxt/browser';
import { checkOfferEligibility } from '../utils/eligibility';
import type { EligibilityResult } from '../utils/eligibility';
import { CHECK_TAB_MESSAGE, ELIGIBILITY_RESULT_MESSAGE, ELIGIBILITY_PENDING_MESSAGE } from '../utils/eligibility-badge';
export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  runAt: 'document_idle',
  main(ctx) {
    if (window.top !== window) return;
    let pending: Promise<EligibilityResult> | null = null;
    let latest: EligibilityResult | null = null;
    let checkedAt = 0;
    let stopped = false;
    function check(force = false): Promise<EligibilityResult> {
      if (pending) return pending;
      if (!force && latest && Date.now()-checkedAt < 60000) return Promise.resolve(latest);
      pending = (async () => {
        await browser.runtime.sendMessage({type:ELIGIBILITY_PENDING_MESSAGE}).catch(()=>{});
        const result = await checkOfferEligibility();
        latest = result; checkedAt = Date.now();
        if (!stopped) await browser.runtime.sendMessage({type:ELIGIBILITY_RESULT_MESSAGE,result}).catch(()=>{});
        return result;
      })().finally(()=>{pending=null;});
      return pending;
    }
    const listener: Parameters<typeof browser.runtime.onMessage.addListener>[0] = (message,sender,sendResponse) => {
      if (sender.id !== browser.runtime.id || message?.type !== CHECK_TAB_MESSAGE) return false;
      void check(message.force === true).then(sendResponse,()=>sendResponse(null));
      return true;
    };
    browser.runtime.onMessage.addListener(listener);
    // Once on document load. Refresh on return to a visible tab after the short cache expires.
    const onVisible = () => { if (document.visibilityState === 'visible' && !stopped) void check().catch(()=>{}); };
    document.addEventListener('visibilitychange',onVisible);
    window.addEventListener('pageshow',onVisible);
    void check().catch(()=>{});
    ctx.onInvalidated(()=>{
      stopped=true; latest=null;
      browser.runtime.onMessage.removeListener(listener);
      document.removeEventListener('visibilitychange',onVisible);
      window.removeEventListener('pageshow',onVisible);
    });
  },
});
