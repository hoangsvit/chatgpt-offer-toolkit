export interface EligibilityResult {
  state: 'eligible' | 'not_eligible' | 'unknown' | 'redeemed';
  plan: string | null;
  campaign: 'assigned' | 'not_listed' | 'unknown';
  reason: string;
  detectedCountry?: string;
}
// Serialized into the current ChatGPT tab. All helpers must remain inside the function.
// Read-only: no checkout, redemption, modification, or third-party requests.
export async function checkOfferEligibility(): Promise<EligibilityResult> {
  let plan: string | null = null;
  let campaign: EligibilityResult['campaign'] = 'unknown';
  let detectedCountry: string | undefined;
  const result = (state: EligibilityResult['state'], reason: string): EligibilityResult => ({state,plan,campaign,reason,...(detectedCountry ? {detectedCountry} : {})});
  if (location.origin !== 'https://chatgpt.com') return result('unknown','Open the official ChatGPT site first.');
  const object = (value: unknown): Record<string,unknown> | null =>
    value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : null;
  const campaignId = 'team-1-month-free';
  let stage = 'Session';
  const request = async (path: string, options: RequestInit = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://chatgpt.com' + path, {
        ...options, credentials:'same-origin', cache:'no-store', redirect:'error', signal:controller.signal
      });
      if (!response.ok) return {status:response.status, body:null};
      stage += ' response';
      return {status:response.status,body:object(await response.json())};
    } finally { clearTimeout(timer); }
  };
  try {
    const sessionResponse = await request('/api/auth/session');
    if (sessionResponse.status !== 200) return result('unknown','Session HTTP '+sessionResponse.status+'. Sign in on ChatGPT and retry.');
    const token = sessionResponse.body?.accessToken;
    if (typeof token !== 'string' || !token) return result('unknown','Sign in to ChatGPT first.');
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
    const team = object(campaigns.team);
    if (team?.id !== campaignId) {
      campaign = 'not_listed';
      return result('unknown','This campaign is not listed for the default personal workspace. Review the official offer page for a definitive result.');
    }
    campaign = 'assigned';
    // Only validate an already assigned campaign; do not change the source flag or probe alternate coupons.
    stage = 'Coupon check';
    const id = profile.account_id;
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return result('unknown','Personal workspace identity could not be verified.');
    const coupon = await request('/backend-api/promo_campaign/check_coupon?coupon=team-1-month-free&is_coupon_from_query_param=false',{method:'GET',headers:{...headers,'ChatGPT-Account-Id':id}});
    if (coupon.status !== 200) return result('unknown','Coupon check unavailable (HTTP '+coupon.status+').');
    const check = coupon.body;
    if (check?.coupon !== campaignId) return result('unknown','Unexpected coupon response.');
    const redemption = object(check.redemption);
    if (redemption?.redeemed === true || redemption?.redeemed_by_user === true || redemption?.redeemed_by_workspace === true) return result('redeemed','The server reports that the promotion was already redeemed.');
    if (check.state === 'not_eligible') return result('not_eligible','The server reports that this account is not eligible.');
    if (check.state === 'eligible' && redemption?.redeemed === false && redemption.redeemed_by_user === false && redemption.redeemed_by_workspace === false) return result('eligible','Coupon eligible and not redeemed. Seat coverage, total and activation are not verified.');
    return result('unknown','The server returned an incomplete or unrecognized eligibility status.');
   } catch (error) {
    const kind = error instanceof Error && error.name === 'AbortError' ? 'timed out' :
      error instanceof SyntaxError ? 'returned invalid JSON' : 'failed (network or browser restriction)';
    return result('unknown',stage+' '+kind+'. Use the official offer page or retry from your personal workspace.');
  }
}
