interface BillingConfig {
  country: string;
  currency: string;
}
interface BusinessCheckoutConfig extends BillingConfig {
  plan?: 'business';
  workspace: string;
  seats: number;
}
interface PlusCheckoutConfig extends BillingConfig {
  plan: 'plus';
  appearance: 'light' | 'dark';
}
export type CheckoutConfig = BusinessCheckoutConfig | PlusCheckoutConfig;
export type CheckoutInput = (Omit<BusinessCheckoutConfig, "seats"> & { seats: number | string }) | PlusCheckoutConfig;
export type CheckoutTotal = {currency: string; minorUnits: number};
export type CheckoutResult = { url: string; notice?: string; error?: never; code?: never; total?: CheckoutTotal } | { error: string; url?: never; code?: "billing_country_mismatch" | "unusual_activity"; total?: never };

export function validateConfig(input: CheckoutInput): CheckoutConfig {
  const country = input.country.trim().toUpperCase();
  const currency = input.currency.trim().toUpperCase();
  if (input.plan === 'plus') {
    if (!/^[A-Z]{2}$/.test(country) || !/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Select your billing country and currency before continuing.");
    }
    return {plan:'plus',country,currency,appearance:input.appearance};
  }
  const workspace = input.workspace.trim();
  const seats = Number(input.seats);
  if (!workspace || workspace.length > 100 || !Number.isInteger(seats) || seats < 2 || seats > 100 || !/^[A-Z]{2}$/.test(country) || !/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Enter a workspace name, 2–100 seats, and valid country/currency codes.");
  }
  return {workspace, seats, country, currency};
}
export function validCheckoutUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && ["checkout.stripe.com", "chatgpt.com", "openai.com", "pay.openai.com"].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}
// This function is serialized into the active ChatGPT tab. Keep helpers local.
export async function requestCheckout(config: CheckoutConfig): Promise<CheckoutResult> {
  if (location.origin !== "https://chatgpt.com") return {error:"Open chatgpt.com and sign in first."};
  try {
    const s = await fetch("/api/auth/session", {credentials:"same-origin", redirect:"error", cache:"no-store"});
    if (!s.ok) return {error:"Unable to read your current session."};
    const {accessToken} = await s.json();
    if (typeof accessToken !== "string" || !accessToken) return {error:"Sign in to ChatGPT first."};
    const headers = {Authorization:"Bearer "+accessToken};
    const billing = {billing_details:{country:config.country,currency:config.currency},cancel_url:"https://chatgpt.com/#pricing"};
    let plusCampaign: string | undefined;
    if (config.plan === 'plus') {
      const options = {credentials:"same-origin",redirect:"error",cache:"no-store",headers} as const;
      const accountResponse = await fetch("/backend-api/accounts/check/v4-2023-04-27",options);
      if (!accountResponse.ok) return {error:"Unable to verify the Plus offer."};
      const account = (await accountResponse.json())?.accounts?.default;
      const accountId = account?.account?.account_id;
      const campaign = account?.eligible_promo_campaigns?.plus?.id;
      if (account?.account?.structure !== "personal" || typeof accountId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId) ||
        typeof campaign !== "string" || !/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(campaign)) {
        return {error:"Unable to verify the Plus offer."};
      }
      const couponResponse = await fetch("/backend-api/promo_campaign/check_coupon?coupon="+encodeURIComponent(campaign)+"&is_coupon_from_query_param=false",{
        ...options,headers:{...headers,"ChatGPT-Account-Id":accountId},
      });
      if (!couponResponse.ok) return {error:"Unable to verify the Plus offer."};
      const coupon = await couponResponse.json();
      if (coupon?.coupon !== campaign || coupon?.state !== "eligible" || coupon?.redemption?.redeemed !== false ||
        coupon.redemption.redeemed_by_user !== false || coupon.redemption.redeemed_by_workspace !== false) {
        return {error:"Unable to verify the Plus offer."};
      }
      plusCampaign = campaign;
    }
    if (config.plan === 'plus') {
      // Never create the Plus checkout from this injected context. A bare
      // fetch lacks the web app's own request protections (its Sentinel
      // proof and device headers), so ChatGPT's risk system declines it
      // with "unusual activity" (HTTP 400) even for eligible accounts.
      // Hand the verified campaign to the official pricing flow instead:
      // ChatGPT's own page creates the checkout when the user continues
      // there. This URL is the same one the pricing page itself uses.
      const url = new URL("https://chatgpt.com/");
      url.searchParams.set("cta_tab","personal");
      url.searchParams.set("highlight_plan","plus");
      url.searchParams.set("promo_campaign",plusCampaign as string);
      url.hash = "pricing";
      return {url:url.href,notice:"Plus offer verified. Open the official ChatGPT pricing page and continue there — ChatGPT creates the Plus checkout itself. Review the amount due today and renewal terms before paying."};
    }
    const payload = {
      ...billing,
      entry_point:"team_workspace_purchase_modal",
      plan_name:"chatgptteamplan",
      team_plan_data:{workspace_name:config.workspace,price_interval:"month",seat_quantity:config.seats},
      checkout_ui_mode:"hosted",
      promo_campaign:{promo_campaign_id:"team-1-month-free",is_coupon_from_query_param:false}
    };
    const resp = await fetch("/backend-api/payments/checkout", {
      method:"POST", credentials:"same-origin", redirect:"error", cache:"no-store",
      headers:{...headers,"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    if (!resp.ok) {
      // Recognize only known safe errors; do not expose arbitrary server response bodies.
      if (resp.status === 400) {
        const failure = await resp.json().catch(() => null);
        if (failure?.detail === "Our systems have detected unusual activity. Please try again later.") {
          return {code:"unusual_activity",error:"ChatGPT declined checkout due to unusual activity (HTTP 400). Coupon eligibility does not guarantee checkout approval. Use the official ChatGPT page or contact support. No retry was made."};
        }
        if (failure?.detail === "Billing country must match request country.") {
          return {code:"billing_country_mismatch",error:"Billing country does not match the country recognized by ChatGPT (HTTP 400). Confirm your actual billing country and currency on the official page. No retry was made."};
        }
      }
      return {error:"Checkout request declined (HTTP "+resp.status+"). Review your billing details on the official offer page."};
    }
    const data = await resp.json();
    const url = [data?.url, data?.stripe_hosted_url, data?.checkout_url].find(
      (value): value is string => typeof value === "string" && value.trim().length > 0
    );
    if (!url) return {error:"No hosted checkout link returned. Review the offer on the official ChatGPT page."};
    // Read only the explicit server total when available. Do not infer from discounts.
    const currency = data?.checkout_state?.currency;
    const minorUnits = data?.checkout_state?.total?.total?.minorUnitsAmount;
    if (data?.status === "open" && typeof currency === "string" &&
        /^[A-Za-z]{3}$/.test(currency) && currency.toUpperCase() === config.currency &&
        typeof minorUnits === "number" && Number.isSafeInteger(minorUnits) && minorUnits >= 0) {
      return {url,total:{currency:currency.toUpperCase(),minorUnits}};
    }
    return {url};
  } catch { return {error:"Request failed. Check your connection or use the official offer page. No automatic retry was performed."}; }
}
