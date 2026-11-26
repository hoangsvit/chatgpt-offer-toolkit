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
type CampaignStatus = 'eligible' | 'denied' | 'redeemed' | 'absent' | 'unknown';

function campaignStatus(value: unknown): CampaignStatus {
  if (!value || typeof value !== 'object') return 'unknown';
  const {state,campaign} = value as Partial<EligibilityResult>;
  if (state === 'eligible' && campaign === 'assigned') return 'eligible';
  if (state === 'not_eligible') return 'denied';
  if (state === 'redeemed') return 'redeemed';
  if (state === 'unknown' && campaign === 'not_listed') return 'absent';
  return 'unknown';
}

export function badgeFor(value: unknown): {text:string;color:string;title:string} {
  const business = campaignStatus(value);
  const personal = campaignStatus(value && typeof value === 'object' ? (value as Partial<EligibilityResult>).plus : undefined);
  const labels: Record<CampaignStatus,string> = {
    eligible:'Eligible',
    denied:'Not eligible',
    redeemed:'Redeemed',
    absent:'Offer not listed',
    unknown:'Unknown',
  };
  const title = 'Plus: '+labels[personal]+' · Business: '+labels[business];
  const green = '#16845b', neutral = '#64736b';
  if (personal === 'eligible' && business === 'eligible') return {text:'2/2',color:green,title};
  if (personal === 'eligible') return {text:'P+',color:green,title};
  if (business === 'eligible') return {text:'B+',color:green,title};
  if (personal === 'unknown' || business === 'unknown') return {text:'?',color:neutral,title};
  if (personal === 'redeemed' && business === 'redeemed') return {text:'USED',color:neutral,title};
  return {text:'NO',color:personal === 'denied' && business === 'denied' ? '#b43b35' : neutral,title};
}
