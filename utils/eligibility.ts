export interface CampaignEligibility {
  state: 'eligible' | 'not_eligible' | 'unknown' | 'redeemed';
  campaign: 'assigned' | 'not_listed' | 'unknown';
  reason: string;
}

export interface EligibilityResult extends CampaignEligibility {
  plan: string | null;
  plus?: CampaignEligibility;
  detectedCountry?: string;
  accountLabel?: string;
}
// Also executed in the ChatGPT tab for isolated sessions. Keep helpers inside the function.
// Read-only: no checkout, redemption, modification, or third-party requests.
export async function checkOfferEligibility(context: 'tab' | 'extension' = 'tab'): Promise<EligibilityResult> {
  let plan: string | null = null;
  let plus: CampaignEligibility | undefined;
  let detectedCountry: string | undefined;
  let accountLabel: string | undefined;
  const result = (state: EligibilityResult['state'], reason: string, campaign: CampaignEligibility['campaign'] = 'unknown'): EligibilityResult => ({
    state,plan,campaign,reason,...(plus ? {plus} : {}),...(detectedCountry ? {detectedCountry} : {}),...(accountLabel ? {accountLabel} : {}),
  });
  if (context === 'tab' && location.origin !== 'https://chatgpt.com') return result('unknown','Open the official ChatGPT site first.');
  if (context === 'extension' && !['chrome-extension:', 'moz-extension:'].includes(location.protocol)) {
    return result('unknown','The extension could not access the ChatGPT session.');
  }
  const object = (value: unknown): Record<string,unknown> | null =>
    value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : null;
  const campaignId = 'team-1-month-free';
  let stage = 'Session';
  const request = async (path: string, options: RequestInit = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://chatgpt.com' + path, {
        ...options, credentials:context === 'extension' ? 'include' : 'same-origin',
        cache:'no-store', redirect:'error', signal:controller.signal
      });
      if (!response.ok) return {status:response.status, body:null};
      return {status:response.status,body:object(await response.json())};
    } finally { clearTimeout(timer); }
  };
  const notListed: CampaignEligibility = {
    state:'unknown',campaign:'not_listed',
    reason:'This campaign is not listed for the default personal workspace. Review the official offer page for a definitive result.',
  };
  const failureReason = (step: string, error: unknown) => {
    const kind = error instanceof Error && error.name === 'AbortError' ? 'timed out' :
      error instanceof SyntaxError ? 'returned invalid JSON' : 'failed (network or browser restriction)';
    return step+' '+kind+'. Use the official offer page or retry from your personal workspace.';
  };
  async function checkCoupon(id: unknown, accountHeaders: Record<string,string>, couponId: string, eligibleReason: string): Promise<CampaignEligibility> {
    const assigned = (state: CampaignEligibility['state'], reason: string): CampaignEligibility => ({state,campaign:'assigned',reason});
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return assigned('unknown','Personal workspace identity could not be verified.');
    }
    try {
      const coupon = await request('/backend-api/promo_campaign/check_coupon?coupon='+encodeURIComponent(couponId)+'&is_coupon_from_query_param=false',{
        method:'GET',headers:{...accountHeaders,'ChatGPT-Account-Id':id},
      });
      if (coupon.status !== 200) return assigned('unknown','Coupon check unavailable (HTTP '+coupon.status+').');
      const check = coupon.body;
      if (check?.coupon !== couponId) return assigned('unknown','Unexpected coupon response.');
      const redemption = object(check.redemption);
      if (redemption?.redeemed === true || redemption?.redeemed_by_user === true || redemption?.redeemed_by_workspace === true) return assigned('redeemed','The server reports that the promotion was already redeemed.');
      if (check.state === 'not_eligible') return assigned('not_eligible','The server reports that this account is not eligible.');
      if (check.state === 'eligible' && redemption?.redeemed === false && redemption.redeemed_by_user === false && redemption.redeemed_by_workspace === false) return assigned('eligible',eligibleReason);
      return assigned('unknown','The server returned an incomplete or unrecognized eligibility status.');
    } catch (error) { return assigned('unknown',failureReason('Coupon check',error)); }
  }
  try {
    const sessionResponse = await request('/api/auth/session');
    if (sessionResponse.status !== 200) return result('unknown','Session HTTP '+sessionResponse.status+'. Sign in on ChatGPT and retry.');
    const token = sessionResponse.body?.accessToken;
    if (typeof token !== 'string' || !token) return result('unknown','Sign in to ChatGPT first.');
    const user = object(sessionResponse.body?.user);
    const name = typeof user?.name === 'string' ? user.name.trim() : '';
    const email = typeof user?.email === 'string' ? user.email.trim() : '';
    accountLabel = (name || email).slice(0,254) || undefined;
    // Observed session context: a country hint, not a verified billing address.
    const country = object(sessionResponse.body?.statsigContext)?.country;
    if (typeof country === 'string' && /^[A-Z]{2}$/.test(country) && !['ZZ','EU','XX'].includes(country)) detectedCountry = country;
    const headers = {Authorization:'Bearer '+token,Accept:'application/json'};
    stage = 'Account check';
    const response = await request('/backend-api/accounts/check/v4-2023-04-27',{method:'GET',headers});
    if (response.status !== 200) return result('unknown','Account check unavailable (HTTP '+response.status+').');
    const data = response.body;
    const account = object(object(data?.accounts)?.default);
    const profile = object(account?.account);
    if (!profile || profile.structure !== 'personal') return result('unknown','A personal default workspace could not be verified. Switch to your personal workspace and check the official offer.');
    if (typeof profile.plan_type === 'string' && /^[a-z0-9_-]{1,40}$/i.test(profile.plan_type)) plan = profile.plan_type;
    const campaigns = object(account?.eligible_promo_campaigns);
    if (!campaigns) return result('unknown','Campaign information is unavailable.');
    // Each coupon is checked only if it is assigned to this personal workspace.
    const plusId = object(campaigns.plus)?.id;
    const [business, individual] = await Promise.all([
      object(campaigns.team)?.id === campaignId
        ? checkCoupon(profile.account_id,headers,campaignId,'Coupon eligible and not redeemed. Seat coverage, total and activation are not verified.')
        : notListed,
      typeof plusId === 'string' && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(plusId)
        ? checkCoupon(profile.account_id,headers,plusId,'Plus offer eligible. Confirm pricing on ChatGPT.')
        : 'plus' in campaigns
          ? {state:'unknown',campaign:'unknown',reason:'Campaign information is unavailable.'} as const
          : notListed,
    ]);
    plus = individual;
    return result(business.state,business.reason,business.campaign);
  } catch (error) { return result('unknown',failureReason(stage,error)); }
}
