export interface CheckoutConfig {
  workspace: string;
  seats: number;
  country: string;
  currency: string;
}
export type CheckoutInput = Omit<CheckoutConfig, "seats"> & { seats: number | string };
export type CheckoutResult = { url: string; error?: never } | { error: string; url?: never };

// This function is serialized and injected into the active tab. Keep it self-contained.
export function validateConfig(input: CheckoutInput): CheckoutConfig {
  const workspace = input.workspace.trim();
  const seats = Number(input.seats);
  const country = input.country.trim().toUpperCase();
  const currency = input.currency.trim().toUpperCase();
  if (!workspace || workspace.length > 100 || !Number.isInteger(seats) || seats < 2 || seats > 100 || !/^[A-Z]{2}$/.test(country) || !/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Enter a workspace name, 2–100 seats, and valid country/currency codes.");
  }
  return {workspace, seats, country, currency};
}
export function validCheckoutUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && ["checkout.stripe.com", "chatgpt.com", "openai.com"].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}
export async function requestCheckout(config: CheckoutConfig): Promise<CheckoutResult> {
  if (location.origin !== "https://chatgpt.com") return {error:"Open chatgpt.com and sign in first."};
  try {
    const s = await fetch("/api/auth/session", {credentials:"same-origin", redirect:"error", cache:"no-store"});
    if (!s.ok) return {error:"Unable to read your current session."};
    const {accessToken} = await s.json();
    if (typeof accessToken !== "string" || !accessToken) return {error:"Sign in to ChatGPT first."};
    const resp = await fetch("/backend-api/payments/checkout", {
      method:"POST", credentials:"same-origin", redirect:"error", cache:"no-store",
      headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},
      body:JSON.stringify({
        entry_point:"team_workspace_purchase_modal",
        plan_name:"chatgptteamplan",
        team_plan_data:{workspace_name:config.workspace,price_interval:"month",seat_quantity:config.seats},
        billing_details:{country:config.country,currency:config.currency},
        cancel_url:"https://chatgpt.com/#pricing",
        checkout_ui_mode:"hosted",
        promo_campaign:{promo_campaign_id:"team-1-month-free",is_coupon_from_query_param:false}
      })
    });
    if (!resp.ok) return {error:"Checkout request declined (HTTP "+resp.status+"). Check eligibility on the official offer page."};
    const data = await resp.json();
    const url = data.url || data.stripe_hosted_url || data.checkout_url;
    if (typeof url !== "string") return {error:"No checkout link returned. The offer may be unavailable."};
    return {url};
  } catch { return {error:"Request failed. Check your connection or use the official offer page. No automatic retry was performed."}; }
}
