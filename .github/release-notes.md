## Install and update

Download a browser package under **Assets**.

| Browser | Package | How to install |
| --- | --- | --- |
| Chrome or Edge | `chrome.zip` | Extract to a permanent folder. Open `chrome://extensions` or `edge://extensions`, enable **Developer mode**, then choose **Load unpacked** and select the folder containing `manifest.json`. |
| Firefox | `firefox.xpi`, when available | Open `about:addons`, select the gear menu, choose **Install Add-on From File** and select the signed XPI. |
| Firefox temporary testing | `firefox-unsigned.zip` | Extract the archive. Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on** and select `manifest.json`. Restarting Firefox removes the temporary installation. |

To update Chrome or Edge, replace the files in the same unpacked folder, then click **Reload** on the extension's card. Signed Firefox installations receive updates through the extension's update feed when Firefox allows add-on updates.

`SHA256SUMS.txt` contains the checksums for both ZIP files.

## Use the extension

Sign in at ChatGPT and open the popup to check **Personal (Plus)** and **Business** together. Choose **Personal** to continue to the official Plus offer on ChatGPT, or choose **Business** to generate a checkout link when eligible. Confirm the amount due today and the renewal terms before paying.

The popup can show a new release or let you skip that version. Details and manual checks are available in **Settings → Software updates**.
