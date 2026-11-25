# ChatGPT Offer Toolkit

An unofficial Chrome / Microsoft Edge extension for reviewing a ChatGPT Business promotional checkout without pasting JavaScript into DevTools.

## Install

1. Download this repository as a ZIP and extract it, or clone it.
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Enable **Developer mode** and click **Load unpacked**.
4. Select the **extension** directory.

## Use

1. Sign in at https://chatgpt.com using your own account.
2. Open the extension popup.
3. Enter the workspace name, seat count, actual billing country and currency.
4. Click **Generate checkout link**. Copy or open the returned link privately.
5. Review the official checkout price, taxes, eligibility, renewal price and terms before making any purchase.

Defaults: MyTeam, 5 seats, VN, USD, monthly billing, campaign `team-1-month-free`. Adjust billing details to match your actual billing situation. The extension does not override eligibility, guarantee a discount, submit payment or change any subscription automatically.

## Privacy and permissions

Only `activeTab` and `scripting` are requested. A user-initiated script runs on the active ChatGPT tab, accesses the current session in memory, and sends its token only to the same-origin checkout endpoint. No persistent storage, telemetry, remote scripts, broad host permissions, token logging, or automatic retries. Checkout URLs may be sensitive; do not post them publicly. The extension blocks unexpected destination hosts and offers a direct official promotional page as a fallback.

## Tests

Run `node --test tests/*.test.cjs` from the repository root with Node.js 22 or newer. Tests mock session and checkout responses; they never contact ChatGPT or create a live checkout.

## Limitations

The checkout endpoint and campaign identifier are undocumented and may change or be unavailable. The service decides eligibility and price. Use the official offer page if the checkout request fails. This project is not affiliated with or endorsed by OpenAI. No browser-store publication is provided.
