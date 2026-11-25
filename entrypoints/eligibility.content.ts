import { defineContentScript } from 'wxt/utils/define-content-script';
import { browser } from 'wxt/browser';
import { checkOfferEligibility } from '../utils/eligibility';
import type { EligibilityResult } from '../utils/eligibility';
import { BADGE_MESSAGE, CHECK_TAB_MESSAGE, ELIGIBILITY_RESULT_MESSAGE, ELIGIBILITY_PENDING_MESSAGE } from '../utils/eligibility-badge';
export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  runAt: 'document_idle',
  main(ctx) {
    if (window.top !== window) return;
    let pending: Promise<EligibilityResult> | null = null;
    let latest: EligibilityResult | null = null;
    let stopped = false;
    function check(force = false): Promise<EligibilityResult> {
      if (pending) return pending;
      // Keep the result (including Unknown) for this document. Only explicit refresh starts another check.
      if (!force && latest) return Promise.resolve(latest);
      pending = (async () => {
        await browser.runtime.sendMessage({type:ELIGIBILITY_PENDING_MESSAGE}).catch(()=>{});
        const result: EligibilityResult = await checkOfferEligibility().catch(()=>({
          state:'unknown',plan:null,campaign:'unknown',reason:'Eligibility check failed. Use Check again to retry.'
        }));
        latest = result;
        if (!stopped) await browser.runtime.sendMessage({type:ELIGIBILITY_RESULT_MESSAGE,result}).catch(()=>{});
        return result;
      })().finally(()=>{pending=null;});
      return pending;
    }
    const listener: Parameters<typeof browser.runtime.onMessage.addListener>[0] = (message,sender,sendResponse) => {
      if (sender.id !== browser.runtime.id) return false;
      if (message?.type === BADGE_MESSAGE) {
        // Active-tab sync is a cache-only read; never starts or awaits an API request.
        sendResponse({pending:pending !== null,result:latest});
        return false;
      }
      if (message?.type !== CHECK_TAB_MESSAGE) return false;
      void check(message.force === true).then(sendResponse,()=>sendResponse(null));
      return true;
    };
    browser.runtime.onMessage.addListener(listener);
    // One automatic check per document; tab focus, pageshow and SPA UI changes do not trigger requests.
    void check().catch(()=>{});
    ctx.onInvalidated(()=>{
      stopped=true; latest=null;
      browser.runtime.onMessage.removeListener(listener);
    });
  },
});
