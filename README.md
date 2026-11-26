<p align="center"><img src="public/icon.svg" alt="Offer Toolkit icon" width="72"></p>

# ChatGPT Offer Toolkit

[![Download for Chrome](https://img.shields.io/github/v/release/hoangsvit/chatgpt-offer-toolkit?label=Download%20Chrome&logo=googlechrome&logoColor=white&color=4285F4)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest/download/chrome.zip)
[![Download for Edge](https://img.shields.io/github/v/release/hoangsvit/chatgpt-offer-toolkit?label=Download%20Edge&color=0078D4)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest/download/chrome.zip)
[![Download Firefox test build](https://img.shields.io/github/v/release/hoangsvit/chatgpt-offer-toolkit?label=Download%20Firefox%20test&logo=firefoxbrowser&logoColor=white&color=E66000)](https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/latest/download/firefox-unsigned.zip)

A Chrome, Edge, and Firefox extension for checking ChatGPT Business offer eligibility and generating a checkout link when ChatGPT confirms the offer. Built by [ePlus.DEV](https://eplus.dev) as an independent project.

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
2. Check **Account eligibility**. Expand **Details** to see the reason, or click refresh to check again.
3. If eligible, review your workspace, seats, billing country, and currency in **Settings**, then click **Generate checkout link**.
4. Review the amount due today and the renewal terms on the official checkout before paying. **Official offer** is available directly from the popup.

The toolbar badge shows **OK** when ChatGPT confirms eligibility, **NO** when it rejects the offer or the offer is absent, and **USED** when it was redeemed. Open **Details** in the popup to see the exact result.

## Update

Open **Settings → Software updates** to check for a new version. On Chrome or Edge, replace the files in the existing unpacked folder and click **Reload** on the extensions page. Signed Firefox builds can update through Firefox.

## Project links

- [Development, contribution and release guide](CONTRIBUTING.md)
- [Installation and update notes included with each release](.github/release-notes.md)
- [BeUI credits and license](public/beui-LICENSE.txt)

Session credentials stay in memory and are sent only to ChatGPT. The extension does not store checkout links, send telemetry, or submit payments.
