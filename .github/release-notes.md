## Install and update

Download a browser package under **Assets**.

| Browser | Package | How to install |
| --- | --- | --- |
| Chrome or Edge | `chrome.zip` | Extract to a permanent folder. Open `chrome://extensions` or `edge://extensions`, enable **Developer mode**, then choose **Load unpacked** and select the folder containing `manifest.json`. |
| Firefox | `firefox.xpi`, when available | Open `about:addons`, select the gear menu, choose **Install Add-on From File** and select the signed XPI. |
| Firefox temporary testing | `firefox-unsigned.zip` | Extract the archive. Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on** and select `manifest.json`. Restarting Firefox removes the temporary installation. |

To update Chrome or Edge, replace the files in the same unpacked folder, then click **Reload** on the extension's card. Signed Firefox installations receive updates through the extension's update feed when Firefox allows add-on updates.

`SHA256SUMS.txt` contains the checksums for both ZIP files. To get started, sign in at ChatGPT, open the extension on that tab, and review **Account eligibility** and **Settings**. Confirm the total and renewal terms on the official checkout page before paying.
