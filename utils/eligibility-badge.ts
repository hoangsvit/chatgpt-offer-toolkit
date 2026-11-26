import type { EligibilityResult } from './eligibility';
export const BADGE_MESSAGE = 'offer-eligibility-badge-v1';
export const CHECK_TAB_MESSAGE = 'offer-eligibility-check-tab-v1';
export const CHECK_POPUP_MESSAGE = 'offer-eligibility-check-popup-v1';
export const ELIGIBILITY_RESULT_MESSAGE = 'offer-eligibility-result-v1';
export const ELIGIBILITY_PENDING_MESSAGE = 'offer-eligibility-pending-v1';
export function isChatGPTUrl(value: unknown): boolean {
  try { return typeof value === 'string' && new URL(value).origin === 'https://chatgpt.com'; }
  catch { return false; }
}
export function badgeFor(value: unknown): {text:string;color:string;title:string} {
  const state = value && typeof value === 'object' ? (value as Partial<EligibilityResult>).state : undefined;
  if (state === 'eligible' && (value as Partial<EligibilityResult>).campaign === 'assigned')
    return {text:'OK',color:'#16845b',title:'Coupon eligible — final price not verified'};
  if (state === 'not_eligible') return {text:'NO',color:'#b43b35',title:'Coupon not eligible'};
  if (state === 'redeemed') return {text:'USED',color:'#64736b',title:'Coupon already redeemed'};
  if (state === 'unknown' && (value as Partial<EligibilityResult>).campaign === 'not_listed')
    return {text:'N/A',color:'#64736b',title:'Offer not listed for this account — final eligibility not verified'};
  return {text:'?',color:'#64736b',title:'Offer eligibility unknown'};
}
