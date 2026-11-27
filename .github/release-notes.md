## Install and update

Download a browser package under **Assets**.

| Browser | Package | Steps |
| --- | --- | --- |
| Google Chrome | `chatgpt-offer-toolkit-{version}-chrome.zip` | Extract to a permanent folder. Open `chrome://extensions`, enable **Developer mode**, then **Load unpacked** and select the folder containing `manifest.json`. |
| Microsoft Edge | `chatgpt-offer-toolkit-{version}-edge.zip` | Follow the same steps at `edge://extensions`. |
| Opera / Opera GX | `chatgpt-offer-toolkit-{version}-opera.zip` | Follow the same steps at `opera://extensions`. |
| Brave / Vivaldi | Chrome ZIP | Follow the same steps at `brave://extensions` or `vivaldi://extensions`. |
| Firefox | `chatgpt-offer-toolkit-{version}-firefox.xpi`, when signed and available | Open `about:addons`, choose **Install Add-on From File**, and select the XPI. |
| Firefox temporary testing | `chatgpt-offer-toolkit-{version}-firefox.zip` (unsigned) | Extract the ZIP. In `about:debugging#/runtime/this-firefox`, select **Load Temporary Add-on** and choose `manifest.json`. Restarting Firefox removes the temporary install. |

Replace `{version}` with the actual release version. Older releases may use `chrome.zip`, `firefox-unsigned.zip`, and `firefox.xpi`.

To update a Chromium-based browser, replace the files in the same unpacked folder, then click **Reload** on the extension's card. Signed Firefox installations receive updates through the extension's update feed when Firefox allows add-on updates.

`SHA256SUMS.txt` contains the checksums for all four browser ZIP files.

## Use the extension

Sign in at ChatGPT and open the popup to check **Personal (Plus)** and **Business** together. Choose **Personal** to continue to the official Plus offer on ChatGPT, or choose **Business** to generate a checkout link when eligible. Confirm the amount due today and the renewal terms before paying.

The popup can show a new release or let you skip that version. Details and manual checks are available in **Settings → Software updates**.
