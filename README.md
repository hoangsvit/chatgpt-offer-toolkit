<p align="center"><img src="public/icon.svg" alt="Offer Toolkit icon" width="88"></p>

# ChatGPT Offer Toolkit

Generate ChatGPT Business promotional checkout links, visit the official offer page, and manage updates. Built by ePlus.DEV.

A browser extension for Chrome, Edge and Firefox. Independent project by [ePlus.DEV](https://eplus.dev); not affiliated with OpenAI.

## Features

- **Eligibility Checker (read-only):** automatically checks the assigned Business campaign when the popup opens and coupon status for the default personal workspace. Coupon eligibility is distinct from a zero-cost checkout.

- **Checkout Generator (primary):** configure workspace, seats, actual billing country and currency, then generate and copy or open the returned checkout link. Available directly in the popup.
- **Open official offer page:** alternative route to the promotion on ChatGPT. Eligibility and pricing are decided by ChatGPT.
- **Promotion banner:** optional top or floating banner on chatgpt.com, with dismissal and visibility settings.
- **Modern popup:** light/dark mode, active-tab status, version and support links.
- **Update Center:** stable release checks on ChatGPT page load (15-minute cache), every six hours, manual checking and links to GitHub Releases.
- **Cross-browser packaging:** Chrome/Edge ZIP and Firefox packages, with optional signed self-distributed Firefox updates.
- **Privacy:** no persistent session tokens, no telemetry, no automatic subscription or payment.

The extension is an offer navigation and checkout helper, not an eligibility bypass or a source of guaranteed free subscriptions.

## Install

Download the browser-specific ZIP artifact from a successful [GitHub Actions run](https://github.com/hoangsvit/chatgpt-offer-toolkit/actions), then extract it.

- **Chrome / Edge:** open `chrome://extensions` or `edge://extensions`, enable Developer mode, select Load unpacked and choose the extracted directory containing manifest.json.
- **Firefox:** open `about:debugging#/runtime/this-firefox`, click Load Temporary Add-on and select the extracted manifest.json. Temporary add-ons are removed when Firefox restarts. Permanent installation requires Mozilla signing.

## Develop and build

Requires Node.js 22.12+; Node.js 26 LTS is recommended and used by CI (see `.nvmrc`). WXT 0.21.5 generates separate Manifest V3 builds. The ePlus ticket icon is generated automatically in PNG sizes 16, 32, 48, 96 and 128 from the local geometric design before development, build and packaging.

```sh
npm install
npm run dev                 # Chrome
npm run dev:firefox         # Firefox
npm run typecheck
npm test
npm run build:all
npm run zip:all
```

Output directories: `.output/chrome-mv3`, `.output/firefox-mv3`. ZIP packages are in `.output/`. The CI workflow builds and uploads both targets. The validation workflow does not submit to a store or sign; release signing is optional.

## Popup design

Modern Minimal: a compact 400px popup with an explicit root width to prevent browser popup shrinkage, system-aware light/dark theme with a manual toggle, active ChatGPT tab status, seat stepper (2–100), editable country/currency suggestions and checkout actions. The tab indicator does not verify login or offer eligibility; those are checked when requesting checkout.

## Promotion banner

The extension displays a clearly branded ePlus.DEV promotion on chatgpt.com. Open Banner settings to enable/disable, select top-right or floating bottom-right placement, choose a dismissal duration (24 hours, 7 days, or until enabled), or show it again. Changes sync to open tabs locally. The banner only opens the official campaign page; it never checks credentials or performs checkout. Both positions are isolated fixed overlays outside the page layout; the default is floating bottom-right. No app-root padding, height, or overflow changes. Actual layout compatibility should be tested in each browser.

## Updates without a public store

The Software updates section checks the latest stable GitHub Release on ChatGPT page load or popup open (shared 15-minute cache), plus a six-hour alarm while the browser is running (all automatic triggers share the same 15-minute throttle), with a manual check and opt-out. An available update is also linked in the promotion banner. No executable code is downloaded or run by the checker.

- Chrome / Edge: download `chrome.zip` from the release, extract the contents into the same unpacked extension directory, then reload the extension. Standard unmanaged Chrome on Windows/macOS does not allow silent self-hosted installs.
- Firefox: `firefox-unsigned.zip` is only for temporary testing. Install `firefox.xpi` when available; signed self-distributed versions use the separate `firefox-updates` release manifest for native Firefox updates. Browser update settings still apply.

To publish a version, bump package.json and merge into `main`. The Release workflow automatically tests, builds, creates the matching tag and publishes browser ZIPs and SHA256SUMS.txt only for a newer stable version. An unchanged or older version is skipped; a matching manual tag or workflow dispatch remains supported. No raw main source is installed. For signing, configure repository Actions secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`. Signing is an optional separate job; no unsigned XPI is advertised as a native update. The signed XPI and update manifest are published only after successful signing. Mozilla may require source review or reject signing; see [self-distribution](https://extensionworkshop.com/documentation/publish/self-distribution/). The dedicated prerelease tag firefox-updates is not the latest stable release.

## Eligibility Checker

Open ChatGPT in your personal workspace, then open the extension popup. Eligibility is checked automatically when a ChatGPT page loads, even with the popup closed. The toolbar badge shows green **OK** only for a server-confirmed eligible coupon (not a verified zero price), red **NO** for explicit rejection, and no badge for unknown or redeemed. A gray ellipsis indicates checking. Results are isolated per tab and kept in memory only. There is exactly one automatic eligibility check per loaded document, including failed or unknown results. Opening the popup reuses the pending or completed result; switching tabs, opening the popup repeatedly and SPA navigation do not trigger another check. Click **Check again** to refresh explicitly, or reload the page (including after signing in or changing account/workspace). If the page checker is unavailable, reload ChatGPT rather than injecting a duplicate checker. There is no timer-based polling, automatic retry, or request on unrelated sites. Refresh existing ChatGPT tabs after installing the extension. The checker reads the current account's campaign assignment and, only if the specific campaign is already assigned, validates that coupon through observed internal ChatGPT GET endpoints. It does not create checkout sessions, redeem promotions, change account state, test alternative countries or alter eligibility. Results are not persisted; session credentials remain in the ChatGPT tab and are sent only to ChatGPT.

- **Coupon eligible:** the server explicitly reports eligible and all redemption flags false. No price, seat coverage, or subscription activation is verified.
- **Not eligible / Already redeemed:** explicit negative server response.
- **Unknown:** missing campaign, ambiguous personal workspace, HTTP error or unexpected data. A missing assignment alone is not treated as a definitive denial.

Use the official checkout to verify 5 Standard seats, 0 Premium seats, monthly billing, a one-month discount, total due today and renewal amount. The private endpoints are not supported public APIs and may change. If the checker reports Unknown, its diagnostic identifies whether the session, account check, or coupon check failed. The coupon request is scoped to the verified default personal workspace; no other workspace is probed. No raw error bodies, account IDs or session tokens are displayed. No account identifiers, tokens or raw HAR data are included in diagnostics or tests.

## Use

The **Checkout Generator** is visible by default in the popup. Use **Open official offer page** as an alternative to the generator.

1. Sign in at https://chatgpt.com using your own account.
2. Open the extension popup.
3. Enter the workspace name, seat count, actual billing country and currency.
4. Click **Generate checkout link**. Copy or open the returned link privately.
5. Review the official checkout price, taxes, eligibility, renewal price and terms before making any purchase.

Defaults: MyTeam, 5 seats, monthly billing, campaign `team-1-month-free`. Billing country starts empty unless the user explicitly saved a previous billing preference. Browser language is never used to set the country. Select the actual billing country to receive a local currency suggestion; both fields remain editable. The official checkout is authoritative for supported currencies and billing country. Optional "Remember billing preference" saves only the chosen country and currency locally after a successful checkout link response; unchecking it or a billing-country mismatch clears the preference. A recognized HTTP 400 billing-country mismatch is displayed explicitly, without automatic retry or changing country. No IP lookup, location permission or extra network request is used. The extension does not override eligibility, guarantee a discount, submit payment or change any subscription automatically.

## Privacy and permissions

Permissions: `activeTab`, `scripting`, `storage`, and `alarms`. GitHub API host access is used only for public release metadata, without account credentials. The content script is restricted to `https://chatgpt.com/*`; no broad host access. A user-initiated script runs on the active ChatGPT tab, accesses the current session in memory, and sends its token only to the same-origin checkout endpoint. Only the light/dark theme preference, banner settings and update metadata/preferences are stored locally; no tokens or checkout URLs are persisted. Country/currency preferences are stored only when the user opts in. No telemetry, remote scripts, broad host permissions, token logging, or automatic retries. Checkout URLs may be sensitive; do not post them publicly. Hosted checkout accepts exact HTTPS destinations on `pay.openai.com`, `checkout.stripe.com`, `chatgpt.com` and `openai.com`; credential-bearing URLs, non-default ports and unrelated hosts are rejected. The extension blocks unexpected destination hosts and offers a direct official promotional page as an alternative.

## Tests

Run `npm test` after installing dependencies. Tests mock session and checkout responses; they never contact ChatGPT or create a live checkout.

## Limitations

The checkout endpoint and campaign identifier are undocumented and may change or be unavailable. The service decides eligibility and price. Use the official offer page if the checkout request fails. This project is not affiliated with or endorsed by OpenAI. No browser-store publication is provided.

## Support

[ePlus.DEV](https://eplus.dev) · [Telegram channel](https://t.me/eplus_news) · [GitHub issues](https://github.com/hoangsvit/chatgpt-offer-toolkit/issues)
