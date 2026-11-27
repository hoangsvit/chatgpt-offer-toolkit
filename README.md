<img width="1672" height="941" alt="Offer Toolkit Dark Mode Hero" src="https://github.com/user-attachments/assets/92f7359c-4706-4b7f-b7ec-6a92e51e31f4" />

# ChatGPT Offer Toolkit

[![Download for Chrome](https://img.shields.io/badge/Chrome-Manual%20Install-4285F4?logo=googlechrome&logoColor=white)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest)
[![Download for Edge](https://img.shields.io/badge/Edge-Manual%20Install-0078D4?logo=microsoftedge&logoColor=white)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest)
[![Download for Opera](https://img.shields.io/badge/Opera-Manual%20Install-FF1B2D?logo=opera&logoColor=white)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest)
[![Download for Firefox](https://img.shields.io/badge/Firefox-Manual%20Install-E66000?logo=firefoxbrowser&logoColor=white)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest)
[![Download for Brave](https://img.shields.io/badge/Brave-Manual%20Install-FB542B?logo=brave&logoColor=white)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest)
[![Download for Vivaldi](https://img.shields.io/badge/Vivaldi-Manual%20Install-EF3939?logo=vivaldi&logoColor=white)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest)

A Chrome, Edge, Opera, Firefox, Brave, and Vivaldi extension that checks ChatGPT **Personal (Plus)** and **Business** offers together. It helps eligible users generate a Business checkout link or continue to the official Plus offer on ChatGPT. Built by [ePlus.DEV](https://eplus.dev) as an independent project.

The popup follows the browser language. It supports English, Vietnamese, Hindi, Indonesian, Malay, Spanish, Brazilian Portuguese, French, Japanese, and Simplified Chinese. Some detailed error messages use English.

[Release notes and all downloads](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest) · [Report an issue](https://github.com/hoangsvit/chatgpt-offer-toolkit/issues/new/choose) · [Contribute](CONTRIBUTING.md)

## Install

Download the package for your browser from **Assets** on GitHub Releases.

| Browser | Package | Steps |
| --- | --- | --- |
| Google Chrome | `chatgpt-offer-toolkit-{version}-chrome.zip` | Extract to a permanent folder. Open `chrome://extensions`, enable **Developer mode**, then **Load unpacked** and select the folder containing `manifest.json`. |
| Microsoft Edge | `chatgpt-offer-toolkit-{version}-edge.zip` | Follow the same steps at `edge://extensions`. |
| Opera / Opera GX | `chatgpt-offer-toolkit-{version}-opera.zip` | Follow the same steps at `opera://extensions`. |
| Brave / Vivaldi | Chrome ZIP | Follow the same steps at `brave://extensions` or `vivaldi://extensions`. |
| Firefox | `chatgpt-offer-toolkit-{version}-firefox.xpi`, when signed and available | Open `about:addons`, choose **Install Add-on From File**, and select the XPI. |
| Firefox temporary testing | `chatgpt-offer-toolkit-{version}-firefox.zip` (unsigned) | Extract the ZIP. In `about:debugging#/runtime/this-firefox`, select **Load Temporary Add-on** and choose `manifest.json`. Restarting Firefox removes the temporary install. |

Replace `{version}` with the actual release version. Older releases may use `chrome.zip`, `firefox-unsigned.zip`, and `firefox.xpi`.

## Use

1. Sign in at [ChatGPT](https://chatgpt.com), open your personal workspace, and click the extension icon.
2. Review both results in **Account eligibility**. Expand **Details** for the reason or use the refresh button to check both again.
3. Choose a plan below the results.
   - **Personal (Plus)** verifies the assigned offer and gives you a link to continue in ChatGPT.
   - **Business** uses the workspace name, seats, billing country, and currency in **Settings**. When eligible, select **Generate checkout link**.
4. Review the amount due today and renewal terms on the official checkout before paying.

### Toolbar badge

| Badge | Color | Meaning |
| --- | --- | --- |
| `2/2` | Green | Both Plus and Business offers are eligible. |
| `P+` | Green | Plus is the only offer confirmed eligible. |
| `B+` | Green | Business is the only offer confirmed eligible. |
| `…` | Gray | The extension is checking or waiting for the page checker. |
| `?` | Gray | At least one result is unknown and neither offer is confirmed eligible. |
| `NO` | Red or gray | Red means both offers were explicitly denied. Gray means neither is eligible and at least one offer is absent or already redeemed. |
| `USED` | Gray | Both offers were already redeemed. |
| `OFF` | Gray | The active tab is outside ChatGPT. |

Hover over the toolbar icon for each plan's status.

## Update

The popup shows the new version with options to open its GitHub release or **Skip this version**. Skipping hides that notice until a different version is available. You can still open the release from **Settings → Software updates**, which shows the installed version, latest release, and last check time. Use **Check now** to refresh.

On Chromium-based browsers, replace the files in the existing unpacked folder and click **Reload** on the extensions page. Signed Firefox builds can update through Firefox.

## Project links

- [Development, contribution and release guide](CONTRIBUTING.md)
- [Installation and update notes included with each release](.github/release-notes.md)
- [BeUI and Allo credits](entrypoints/popup/beui/UPSTREAM.md)

Session credentials stay in memory and are sent only to ChatGPT. The extension does not store checkout links, send telemetry, or submit payments.
