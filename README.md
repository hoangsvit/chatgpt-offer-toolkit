
<img width="1672" height="941" alt="Offer Toolkit Dark Mode Hero" src="https://github.com/user-attachments/assets/92f7359c-4706-4b7f-b7ec-6a92e51e31f4" />

# ChatGPT Offer Toolkit

[![Download for Chrome](https://img.shields.io/github/v/release/hoangsvit/chatgpt-offer-toolkit?label=Download%20Chrome&logo=googlechrome&logoColor=white&color=4285F4)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest/download/chrome.zip)
[![Download for Edge](https://img.shields.io/github/v/release/hoangsvit/chatgpt-offer-toolkit?label=Download%20Edge&color=0078D4)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest/download/chrome.zip)
[![Download Firefox test build](https://img.shields.io/github/v/release/hoangsvit/chatgpt-offer-toolkit?label=Download%20Firefox%20test&logo=firefoxbrowser&logoColor=white&color=E66000)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest/download/firefox-unsigned.zip)


A Chrome, Edge, and Firefox extension for checking ChatGPT Business and Plus offers and generating checkout links when eligible. Built by [ePlus.DEV](https://eplus.dev) as an independent project.

The popup follows the browser language. It supports English, Vietnamese, Hindi, Indonesian, Malay, Spanish, Brazilian Portuguese, French, Japanese, and Simplified Chinese. Some detailed error messages use English.

[Release notes and all downloads](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest) · [Report an issue](https://github.com/hoangsvit/chatgpt-offer-toolkit/issues/new/choose) · [Contribute](CONTRIBUTING.md)

## Install

Download the package for your browser from **Assets** on GitHub Releases.

| Browser | Package | Steps |
| --- | --- | --- |
| Chrome or Edge | `chrome.zip` | Extract the ZIP. Open `chrome://extensions` or `edge://extensions`, enable **Developer mode**, then choose **Load unpacked** and select the folder containing `manifest.json`. |
| Firefox | `firefox.xpi`, when available | In `about:addons`, open the gear menu, choose **Install Add-on From File**, and select the XPI. |
| Firefox temporary testing | `firefox-unsigned.zip` | Extract the ZIP. In `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on** and select `manifest.json`. Restarting Firefox removes the temporary install. |

## Use

1. Sign in at [ChatGPT](https://chatgpt.com), open your personal workspace, and click the extension icon.
2. **Account eligibility** automatically checks Personal (Plus) and Business together. Expand **Details** or click refresh to recheck both. Choose the plan below the results for its checkout.
3. When eligible, review your billing country and currency in **Settings**. **Business** also requires a workspace name and seat count. Then click **Generate checkout link**. For **Plus**, the extension first verifies the offer, then hands off to the official ChatGPT pricing page — ChatGPT creates the Plus checkout itself, because a checkout created outside its own page is declined as unusual activity.
4. Review the amount due today and the renewal terms on the official checkout before paying. **Official offer** is available directly from the popup.

The toolbar badge summarizes both plans: **2/2** means both coupons are confirmed eligible; **P+** means Personal (Plus) is eligible; **B+** means Business is eligible; **?** means an unresolved result and no confirmed eligible coupon; **NO** means neither offer is currently confirmed available after both checks; **USED** means both were redeemed. Hover over the icon for each plan's exact status. Coupon eligibility does not verify the final checkout price.

## Update

The popup shows new releases and lets you download or skip the displayed version. Check for updates anytime in **Settings → Software updates**. On Chrome or Edge, replace the files in the existing unpacked folder and click **Reload** on the extensions page. Signed Firefox builds can update through Firefox.

## Project links

- [Development, contribution and release guide](CONTRIBUTING.md)
- [Installation and update notes included with each release](.github/release-notes.md)
- [BeUI credits and license](public/beui-LICENSE.txt)

Session credentials stay in memory and are sent only to ChatGPT. The extension does not store checkout links, send telemetry, or submit payments.
