<p align="center"><img src="public/icon.svg" alt="Offer Toolkit icon" width="88"></p>

# ChatGPT Offer Toolkit

A Chrome, Edge, and Firefox extension for checking ChatGPT Business offer eligibility, opening the official promotion, and generating a checkout link for your workspace. Built by [ePlus.DEV](https://eplus.dev) as an independent project.

[Download the latest release](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest) · [Report an issue](https://github.com/hoangsvit/chatgpt-offer-toolkit/issues/new/choose) · [Contribute](CONTRIBUTING.md)

## Install

Choose the package under **Assets** on the [latest stable GitHub Release](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest). Releases are distributed through GitHub.

| Browser | Package | Installation |
| --- | --- | --- |
| Chrome or Edge | `chrome.zip` | Extract to a permanent folder. Open `chrome://extensions` or `edge://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the folder containing `manifest.json`. |
| Firefox | `firefox.xpi`, when available | Open `about:addons`, choose **Install Add-on From File** from the gear menu, and select the signed XPI. |
| Firefox temporary testing | `firefox-unsigned.zip` | Extract the ZIP, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `manifest.json`. This installation ends when Firefox restarts. |

For a PR preview, download the successful run's browser artifact from [GitHub Actions](https://github.com/hoangsvit/chatgpt-offer-toolkit/actions). Verify release ZIPs against `SHA256SUMS.txt` if needed.

## Use the extension

1. Sign in at [ChatGPT](https://chatgpt.com) and switch to your personal workspace.
2. Open the extension. **Connected to ChatGPT** displays your name, or your email if a name is unavailable, when the session provides it.
3. Review **Account eligibility**. Expand **Details** for the reason or press the refresh icon to check again.
4. Enter your workspace, seat count, actual billing country, and currency in **Settings**. Country and currency use BeUI Select. Selecting a country suggests its local currency, which you can override.
5. Select **Generate checkout link** or visit **Official offer**. Confirm the discount, amount due today, taxes, and renewal terms on the official checkout before paying.

The starting defaults are `MyTeam`, five seats, and monthly billing. The signed-in session may suggest a country, and the extension preserves manually selected or saved billing preferences. Enable **Remember billing after link succeeds** to save the selected country and currency locally after successful link generation. Turning it off or receiving a recognized billing-country mismatch clears the saved preference.

### Eligibility and pricing

| Toolbar badge | Meaning |
| --- | --- |
| Green **OK** | ChatGPT confirmed coupon eligibility and no redemption. Verify the actual price in checkout. |
| Red **NO** | ChatGPT explicitly reported ineligibility. |
| Gray **NO** | The offer is absent from the personal workspace. The popup shows **Offer not listed**. |
| Gray **USED** | ChatGPT reported that the offer was already redeemed. |
| **?** / **…** / **OFF** | Result unavailable, check in progress or pending, or the tab is outside ChatGPT. |

The badge and popup share the same result for the tab. The popup can check a ChatGPT tab that was already open when you installed or updated the extension. On supported ChatGPT checkout pages, the price review can read the displayed due-today amount. External payment pages must be reviewed directly. ChatGPT determines availability and prices, and its internal endpoints may change.

### Updates

**Software updates** checks GitHub for a newer stable release. Automatic checks reuse a result for 15 minutes and may run on ChatGPT page load, on popup open on ChatGPT, or on a six-hour background alarm. You can turn them off or use **Check for updates** manually.

- **Chrome and Edge:** replace the files in the existing unpacked directory and click **Reload** on the extensions page.
- **Firefox:** signed installations can update through the native update feed. Load a new temporary build manually when testing the unsigned package.

## Privacy

The extension requests `activeTab`, `scripting`, `storage`, and `alarms`, with host access to ChatGPT and the GitHub API. The ChatGPT session is used for eligibility and checkout. Session credentials stay in memory and are sent only to ChatGPT. GitHub requests retrieve public release metadata. The extension stores theme preferences, update metadata and preferences, and billing choices when enabled. It does not persist session tokens or checkout links, send telemetry, or submit payments. Keep checkout links private.

## Development and release

Use Node.js 22.12 or later. CI uses `.nvmrc`.

```sh
npm install
npm run dev
npm run dev:firefox
npm run typecheck
npm test
npm run build:all
```

Unpacked builds are in `.output/chrome-mv3` and `.output/firefox-mv3`. Run `npm run zip:all` to produce local ZIPs. Tests use synthetic account and checkout responses.

A newer stable `package.json` version merged to `main` triggers the release workflow. After validation, it creates the matching `v<version>` tag if absent and publishes a GitHub Release with browser packages and installation instructions. The workflow supports optional unlisted Firefox signing for self-distribution. See the [release checklist](CONTRIBUTING.md#publish-a-github-release).

## Support and credits

[GitHub issues](https://github.com/hoangsvit/chatgpt-offer-toolkit/issues) · [ePlus.DEV](https://eplus.dev) · [Telegram](https://t.me/eplus_news)

Built with WXT, React, and locally vendored BeUI components. See the [BeUI attribution](entrypoints/popup/beui/UPSTREAM.md) and [license](public/beui-LICENSE.txt). ChatGPT and OpenAI are trademarks of their respective owners.
