# ChatGPT Offer Toolkit

An unofficial Chrome / Microsoft Edge / Firefox extension for reviewing a ChatGPT Business promotional checkout without pasting JavaScript into DevTools.

## Install

Download the browser-specific ZIP artifact from a successful [GitHub Actions run](https://github.com/hoangsvit/chatgpt-offer-toolkit/actions), then extract it.

- **Chrome / Edge:** open `chrome://extensions` or `edge://extensions`, enable Developer mode, select Load unpacked and choose the extracted directory containing manifest.json.
- **Firefox:** open `about:debugging#/runtime/this-firefox`, click Load Temporary Add-on and select the extracted manifest.json. Temporary add-ons are removed when Firefox restarts. Permanent installation requires Mozilla signing.

## Develop and build

Requires Node.js 22.12+ (CI uses Node 24). WXT 0.21.5 generates separate Manifest V3 builds.

```sh
npm install
npm run dev                 # Chrome
npm run dev:firefox         # Firefox
npm run typecheck
npm test
npm run build:all
npm run zip:all
```

Output directories: `.output/chrome-mv3`, `.output/firefox-mv3`. ZIP packages are in `.output/`. The CI workflow builds and uploads both targets. No store submission or signing is performed.

## Popup design

Modern Minimal: a compact 380px popup, system-aware light/dark theme with a manual toggle, active ChatGPT tab status, seat stepper (2–100), editable country/currency suggestions and checkout actions. The tab indicator does not verify login or offer eligibility; those are checked when requesting checkout.

## Use

1. Sign in at https://chatgpt.com using your own account.
2. Open the extension popup.
3. Enter the workspace name, seat count, actual billing country and currency.
4. Click **Generate checkout link**. Copy or open the returned link privately.
5. Review the official checkout price, taxes, eligibility, renewal price and terms before making any purchase.

Defaults: MyTeam, 5 seats, VN, USD, monthly billing, campaign `team-1-month-free`. Adjust billing details to match your actual billing situation. The extension does not override eligibility, guarantee a discount, submit payment or change any subscription automatically.

## Privacy and permissions

Only `activeTab` and `scripting` are requested. A user-initiated script runs on the active ChatGPT tab, accesses the current session in memory, and sends its token only to the same-origin checkout endpoint. Only the light/dark theme preference is stored locally; no tokens, checkout URLs, or billing details are persisted. No telemetry, remote scripts, broad host permissions, token logging, or automatic retries. Checkout URLs may be sensitive; do not post them publicly. The extension blocks unexpected destination hosts and offers a direct official promotional page as a fallback.

## Tests

Run `npm test` after installing dependencies. Tests mock session and checkout responses; they never contact ChatGPT or create a live checkout.

## Limitations

The checkout endpoint and campaign identifier are undocumented and may change or be unavailable. The service decides eligibility and price. Use the official offer page if the checkout request fails. This project is not affiliated with or endorsed by OpenAI. No browser-store publication is provided.
