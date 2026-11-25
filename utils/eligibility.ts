export interface EligibilityResult {
  state: 'eligible' | 'not_eligible' | 'unknown' | 'redeemed';
  plan: string | null;
  campaign: 'assigned' | 'not_listed' | 'unknown';
  reason: string;
}
// Serialized into the current ChatGPT tab. All helpers must remain inside the function.
// Read-only: no checkout, redemption, modification, or third-party requests.
export async function checkOfferEligibility(): Promise<EligibilityResult> {
  let plan: string | null = null;
  let campaign: EligibilityResult['campaign'] = 'unknown';
  const result = (state: EligibilityResult['state'], reason: string): EligibilityResult => ({state,plan,campaign,reason});
  if (location.origin !== 'https://chatgpt.com') return result('unknown','Open the official ChatGPT site first.');
  const object = (value: unknown): Record<string,unknown> | null =>
    value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : null;
  const campaignId = 'team-1-month-free';
  try {
    const sessionResponse = await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
    if (!sessionResponse.ok) return result('unknown','Unable to verify your session.');
    const token = object(await sessionResponse.json())?.accessToken;
    if (typeof token !== 'string' || !token) return result('unknown','Sign in to ChatGPT first.');
    const options: RequestInit = {method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(15000)};
    const response = await fetch('/backend-api/accounts/check/v4-2023-04-27',options);
    if (!response.ok) return result('unknown','Account check unavailable (HTTP '+response.status+').');
    const data = object(await response.json());
    const account = object(object(data?.accounts)?.default);
    const profile = object(account?.account);
    if (!profile || profile.structure !== 'personal') return result('unknown','A personal default workspace could not be verified. Switch to your personal workspace and check the official offer.');
    if (typeof profile.plan_type === 'string' && /^[a-z0-9_-]{1,40}$/i.test(profile.plan_type)) plan = profile.plan_type;
    const campaigns = object(account?.eligible_promo_campaigns);
    if (!campaigns) return result('unknown','Campaign information is unavailable.');
    const team = object(campaigns.team);
    if (team?.id !== campaignId) {
      campaign = 'not_listed';
      return result('unknown','This campaign is not listed for the default personal workspace. Review the official offer page for a definitive result.');
    }
    campaign = 'assigned';
    // Only validate an already assigned campaign; do not change the source flag or probe alternate coupons.
    const coupon = await fetch('/backend-api/promo_campaign/check_coupon?coupon=team-1-month-free&is_coupon_from_query_param=false',{...options,signal:AbortSignal.timeout(15000)});
    if (!coupon.ok) return result('unknown','Coupon check unavailable (HTTP '+coupon.status+').');
    const check = object(await coupon.json());
    if (check?.coupon !== campaignId) return result('unknown','Unexpected coupon response.');
    const redemption = object(check.redemption);
    if (redemption?.redeemed === true || redemption?.redeemed_by_user === true || redemption?.redeemed_by_workspace === true) return result('redeemed','The server reports that the promotion was already redeemed.');
    if (check.state === 'not_eligible') return result('not_eligible','The server reports that this account is not eligible.');
    if (check.state === 'eligible' && redemption?.redeemed === false && redemption.redeemed_by_user === false && redemption.redeemed_by_workspace === false) return result('eligible','Coupon eligible and not redeemed. Seat coverage, total and activation are not verified.');
    return result('unknown','The server returned an incomplete or unrecognized eligibility status.');
  } catch { return result('unknown','Eligibility could not be checked. Use the official offer page.'); }
}
