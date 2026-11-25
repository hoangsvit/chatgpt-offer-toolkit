<p align="center"><img src="public/icon.svg" alt="Offer Toolkit icon" width="88"></p>

# ChatGPT Offer Toolkit

Generate ChatGPT Business promotional checkout links, visit the official offer page, and manage updates. Built by ePlus.DEV.

A browser extension for Chrome, Edge and Firefox. Independent project by [ePlus.DEV](https://eplus.dev); not affiliated with OpenAI.

## Features

- **Checkout Generator (primary):** configure workspace, seats, actual billing country and currency, then generate and copy or open the returned checkout link. Available directly in the popup.
- **Open official offer page:** alternative route to the promotion on ChatGPT. Eligibility and pricing are decided by ChatGPT.
- **Promotion banner:** optional top or floating banner on chatgpt.com, with dismissal and visibility settings.
- **Modern popup:** light/dark mode, active-tab status, version and support links.
- **Update Center:** stable release checks every six hours, manual checking and links to GitHub Releases.
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

The extension displays a clearly branded ePlus.DEV promotion on chatgpt.com. Open Banner settings to enable/disable, select top or floating placement, choose a dismissal duration (24 hours, 7 days, or until enabled), or show it again. Changes sync to open tabs locally. The banner only opens the official campaign page; it never checks credentials or performs checkout. The default top banner is inserted into page flow rather than fixed over the header. Actual layout compatibility should be tested in each browser.

## Updates without a public store

The popup Software updates section checks the latest stable GitHub Release every six hours (while the browser is running), with a manual check and an opt-out. An available update is also linked in the promotion banner. No executable code is downloaded or run by the checker.

- Chrome / Edge: download `chrome.zip` from the release, extract the contents into the same unpacked extension directory, then reload the extension. Standard unmanaged Chrome on Windows/macOS does not allow silent self-hosted installs.
- Firefox: `firefox-unsigned.zip` is only for temporary testing. Install `firefox.xpi` when available; signed self-distributed versions use the separate `firefox-updates` release manifest for native Firefox updates. Browser update settings still apply.

To publish a version, update package.json, merge the change and push a matching `vX.Y.Z` tag. The Release workflow tests, builds and publishes browser ZIPs and SHA256SUMS.txt. For signing, configure repository Actions secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`. Signing is an optional separate job; no unsigned XPI is advertised as a native update. The signed XPI and update manifest are published only after successful signing. Mozilla may require source review or reject signing; see [self-distribution](https://extensionworkshop.com/documentation/publish/self-distribution/). The dedicated prerelease tag firefox-updates is not the latest stable release.

## Use

The **Checkout Generator** is visible by default in the popup. Use **Open official offer page** as an alternative to the generator.

1. Sign in at https://chatgpt.com using your own account.
2. Open the extension popup.
3. Enter the workspace name, seat count, actual billing country and currency.
4. Click **Generate checkout link**. Copy or open the returned link privately.
5. Review the official checkout price, taxes, eligibility, renewal price and terms before making any purchase.

Defaults: MyTeam, 5 seats, monthly billing, campaign `team-1-month-free`. Billing country and local currency are suggested from an explicit region in the browser's language preferences (for example, vi-VN → VN / VND or en-GB → GB / GBP). No IP lookup, account billing lookup, location permission or extra network request is used. A browser region is only a hint, not a verified billing address or supported checkout currency. If no explicit region or currency mapping exists, enter the missing fields manually. Changing country suggests its local currency until the currency is manually edited; both fields remain editable. Confirm the actual country and supported currency before generating a link. The extension does not override eligibility, guarantee a discount, submit payment or change any subscription automatically.

## Privacy and permissions

Permissions: `activeTab`, `scripting`, `storage`, and `alarms`. GitHub API host access is used only for public release metadata, without account credentials. The content script is restricted to `https://chatgpt.com/*`; no broad host access. A user-initiated script runs on the active ChatGPT tab, accesses the current session in memory, and sends its token only to the same-origin checkout endpoint. Only the light/dark theme preference, banner settings and update metadata/preferences are stored locally; no tokens, checkout URLs, or billing details are persisted. No telemetry, remote scripts, broad host permissions, token logging, or automatic retries. Checkout URLs may be sensitive; do not post them publicly. Hosted checkout accepts exact HTTPS destinations on `pay.openai.com`, `checkout.stripe.com`, `chatgpt.com` and `openai.com`; credential-bearing URLs, non-default ports and unrelated hosts are rejected. The extension blocks unexpected destination hosts and offers a direct official promotional page as an alternative.

## Tests

Run `npm test` after installing dependencies. Tests mock session and checkout responses; they never contact ChatGPT or create a live checkout.

## Limitations

The checkout endpoint and campaign identifier are undocumented and may change or be unavailable. The service decides eligibility and price. Use the official offer page if the checkout request fails. This project is not affiliated with or endorsed by OpenAI. No browser-store publication is provided.

## Support

[ePlus.DEV](https://eplus.dev) · [Telegram channel](https://t.me/eplus_news) · [GitHub issues](https://github.com/hoangsvit/chatgpt-offer-toolkit/issues)
