<img width="1672" height="941" alt="Offer Toolkit Dark Mode Hero" src="https://github.com/user-attachments/assets/92f7359c-4706-4b7f-b7ec-6a92e51e31f4" />

# ChatGPT Offer Toolkit

[![Download for Chrome](https://img.shields.io/github/v/release/hoangsvit/chatgpt-offer-toolkit?label=Download%20Chrome&logo=googlechrome&logoColor=white&color=4285F4)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest/download/chrome.zip)
[![Download for Edge](https://img.shields.io/github/v/release/hoangsvit/chatgpt-offer-toolkit?label=Download%20Edge&color=0078D4)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest/download/chrome.zip)
[![Download Firefox test build](https://img.shields.io/github/v/release/hoangsvit/chatgpt-offer-toolkit?label=Download%20Firefox%20test&logo=firefoxbrowser&logoColor=white&color=E66000)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest/download/firefox-unsigned.zip)

A Chrome, Edge, and Firefox extension that checks ChatGPT **Personal (Plus)** and **Business** offers together. It helps eligible users generate a Business checkout link or continue to the official Plus offer on ChatGPT. Built by [ePlus.DEV](https://eplus.dev) as an independent project.

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
2. Review both results in **Account eligibility**. Expand **Details** for the reason or use the refresh button to check both again.
3. Choose a plan below the results.
   - **Personal (Plus)** verifies the assigned offer and gives you a link to continue in ChatGPT.
   - **Business** uses the workspace name, seats, billing country, and currency in **Settings**. When eligible, select **Generate checkout link**.
4. Review the amount due today and renewal terms on the official checkout before paying.

Hover over the toolbar icon for each plan's status. **2/2** means both offers are eligible, **P+** means Plus is eligible, and **B+** means Business is eligible. **?** means a result is unresolved, **NO** means neither check found an eligible offer, and **USED** means both were redeemed.

## Update

The popup shows the new version with options to open its GitHub release or **Skip this version**. Skipping hides that notice until a different version is available. You can still open the release from **Settings → Software updates**, which shows the installed version, latest release, and last check time. Use **Check now** to refresh.

On Chrome or Edge, replace the files in the existing unpacked folder and click **Reload** on the extensions page. Signed Firefox builds can update through Firefox.

## Project links

- [Development, contribution and release guide](CONTRIBUTING.md)
- [Installation and update notes included with each release](.github/release-notes.md)
- [BeUI and Allo credits](entrypoints/popup/beui/UPSTREAM.md)

Session credentials stay in memory and are sent only to ChatGPT. The extension does not store checkout links, send telemetry, or submit payments.
