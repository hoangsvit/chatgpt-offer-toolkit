import { browser } from 'wxt/browser';
import { validateConfig, validCheckoutUrl, requestCheckout } from '../../utils/checkout';
import type { CheckoutConfig, CheckoutResult } from '../../utils/checkout';
import './style.css';
import { checkOfferEligibility } from '../../utils/eligibility';
import { CHECK_TAB_MESSAGE } from '../../utils/eligibility-badge';
import type { EligibilityResult } from '../../utils/eligibility';
import { suggestBilling, currencyForCountry } from '../../utils/billing-locale';
import { BANNER_KEY, OFFER_URL, EPLUS_URL, SUPPORT_URL, normalizeSettings } from '../../utils/banner-settings';
import type { BannerSettings } from '../../utils/banner-settings';

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error('Missing UI element: ' + id);
  return node as T;
}
const field = (id: string) => element<HTMLInputElement>(id);
const button = (id: string) => element<HTMLButtonElement>(id);
const generate = button('generate');
const seats = field('seats');
const countryField = field('country');
const currencyField = field('currency');
const billingHint = element('billing-suggestion');
const suggested = suggestBilling([...navigator.languages, navigator.language, Intl.DateTimeFormat().resolvedOptions().locale]);
let currencyEdited = false;
if (suggested) {
  countryField.value = suggested.country;
  currencyField.value = suggested.currency ?? '';
  billingHint.textContent = suggested.currency
    ? 'Suggested from browser region: ' + suggested.country + ' / ' + suggested.currency + '. Confirm or edit.'
    : 'Suggested country: ' + suggested.country + '. Enter your supported billing currency.';
} else {
  billingHint.textContent = 'No browser region found. Enter your actual billing country and currency.';
}
currencyField.addEventListener('input', () => { currencyEdited = true; });
countryField.addEventListener('input', () => {
  if (!currencyEdited) {
    currencyField.value = currencyForCountry(countryField.value) ?? '';
  }
  billingHint.textContent = 'Confirm your billing details before generating a link.';
});
let currentUrl: string | null = null;
let busy = false;
let tabReady = false;
let eligibilityBusy = false;
const eligibilityButton = button('eligibility-check');

element('version').textContent = 'v' + browser.runtime.getManifest().version;
const media = window.matchMedia('(prefers-color-scheme: dark)');
type Theme = 'light' | 'dark';
let selectedTheme: Theme | null = null;
try {
  const stored = localStorage.getItem('offer-toolkit-theme');
  if (stored === 'light' || stored === 'dark') selectedTheme = stored;
} catch { /* private storage may be unavailable */ }
function applyTheme() {
  const theme = selectedTheme ?? (media.matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  element('moon').hidden = theme === 'dark';
  element('sun').hidden = theme !== 'dark';
  button('theme').setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
}
button('theme').addEventListener('click', () => {
  selectedTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('offer-toolkit-theme', selectedTheme); } catch { /* theme still works in memory */ }
  applyTheme();
});
media.addEventListener('change', applyTheme);
applyTheme();

function status(message: string) {
  const node = element('status');
  node.textContent = message;
  node.hidden = !message;
}
function resetResult() {
  currentUrl = null;
  field('link').value = '';
  element('result').hidden = true;
}
function syncSeats() {
  const value = seats.valueAsNumber;
  button('minus').disabled = Number.isFinite(value) && value <= 2;
  button('plus').disabled = Number.isFinite(value) && value >= 100;
}
function stepSeats(delta: number) {
  const value = Number.isFinite(seats.valueAsNumber) ? Math.round(seats.valueAsNumber) : 5;
  seats.value = String(Math.max(2, Math.min(100, value + delta)));
  syncSeats();
  resetResult();
  status('');
}
button('minus').addEventListener('click', () => stepSeats(-1));
button('plus').addEventListener('click', () => stepSeats(1));
seats.addEventListener('input', syncSeats);
syncSeats();
element<HTMLFormElement>('settings').addEventListener('input', () => { resetResult(); status(''); });

async function getActiveChatGPTTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null || !tab.url || new URL(tab.url).origin !== 'https://chatgpt.com') return null;
  return tab.id;
}
function renderConnection(ready: boolean) {
  tabReady = ready;
  element('connection').dataset.state = ready ? 'ready' : 'unavailable';
  element('connection-text').textContent = ready ? 'ChatGPT tab ready · sign-in checked on request' : 'Open chatgpt.com to generate a checkout link';
  generate.disabled = busy || !tabReady || eligibilityBusy;
  eligibilityButton.disabled = busy || !tabReady || eligibilityBusy;
}
function renderEligibility(value: EligibilityResult | undefined) {
  const state = element('eligibility-state');
  const labels = {eligible:'Coupon eligible',not_eligible:'Not eligible',unknown:'Unknown',redeemed:'Already redeemed'};
  state.dataset.state = value?.state ?? 'unknown';
  state.textContent = value ? labels[value.state] : 'Unknown';
  element('eligibility-plan').textContent = value?.plan ?? '—';
  element('eligibility-campaign').textContent = value?.campaign === 'assigned' ? 'Assigned' : value?.campaign === 'not_listed' ? 'Not listed' : 'Unknown';
  element('eligibility-reason').textContent = value?.reason ?? 'No verified response. Review the official offer page.';
}
async function runEligibilityCheck(force = false) {
  if (busy || eligibilityBusy) return;
  eligibilityBusy = true;
  eligibilityButton.disabled = true;
  generate.disabled = true;
  eligibilityButton.textContent = 'Checking…';
  renderEligibility({state:'unknown',plan:null,campaign:'unknown',reason:'Checking your current personal workspace…'});
  element('eligibility-state').textContent = 'Checking…';
  try {
    const tabId = await getActiveChatGPTTab();
    renderConnection(tabId !== null);
    if (tabId === null) {
      renderEligibility({state:'unknown',plan:null,campaign:'unknown',reason:'Open chatgpt.com and reopen this popup to check eligibility.'});
      element('eligibility-state').textContent = 'Not checked';
      return;
    }
    // Reuse the page's in-flight check or recent in-memory result.
    let result: EligibilityResult | undefined;
    try {
      result = await browser.tabs.sendMessage(tabId,{type:CHECK_TAB_MESSAGE,force}) as EligibilityResult | undefined;
    } catch {
      // Existing tabs opened before extension installation may lack the content script.
      const [response] = await browser.scripting.executeScript({target:{tabId},func:checkOfferEligibility});
      result = response?.result as EligibilityResult | undefined;
    }
    renderEligibility(result);
  } catch { renderEligibility(undefined); }
  finally {
    eligibilityBusy = false;
    eligibilityButton.textContent = 'Check again';
    renderConnection(tabReady);
  }
}
eligibilityButton.addEventListener('click', () => void runEligibilityCheck(true));
// Reuse the current tab's automatic eligibility check; no checkout.
void runEligibilityCheck();

element<HTMLFormElement>('settings').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || eligibilityBusy) return;
  resetResult();
  let config: CheckoutConfig;
  try {
    config = validateConfig({workspace:field('workspace').value,seats:seats.value,country:field('country').value,currency:field('currency').value});
  } catch (error) { status(error instanceof Error ? error.message : 'Invalid settings.'); return; }
  busy = true;
  generate.disabled = true;
  eligibilityButton.disabled = true;
  element('generate-label').textContent = 'Generating…';
  const controls = ['workspace','seats','country','currency','minus','plus'];
  for (const id of controls) element<HTMLInputElement | HTMLButtonElement>(id).disabled = true;
  status('Requesting checkout from your current ChatGPT session…');
  try {
    const tabId = await getActiveChatGPTTab();
    renderConnection(tabId !== null);
    if (tabId === null) { status('Open chatgpt.com, sign in, and reopen the extension.'); return; }
    const [response] = await browser.scripting.executeScript({target:{tabId},func:requestCheckout,args:[config]});
    const result = response?.result as CheckoutResult | undefined;
    if (!result?.url) { status(result?.error || 'No checkout response received.'); return; }
    currentUrl = validCheckoutUrl(result.url);
    if (!currentUrl) { status('Checkout returned an unrecognized or insecure URL. Use the official offer page instead.'); return; }
    field('link').value = currentUrl;
    element('result').hidden = false;
    status('Link generated. This does not confirm a free offer. Review the official checkout.');
  } catch { status('Unable to access the ChatGPT tab. Reopen the extension and try again.'); }
  finally {
    busy = false;
    generate.disabled = !tabReady;
    eligibilityButton.disabled = !tabReady;
    element('generate-label').textContent = 'Generate checkout link';
    for (const id of controls) element<HTMLInputElement | HTMLButtonElement>(id).disabled = false;
    syncSeats();
  }
});
button('copy').addEventListener('click', async () => {
  if (!currentUrl) return;
  try { await navigator.clipboard.writeText(currentUrl); status('Link copied. Keep it private.'); }
  catch { field('link').select(); status('Select and copy the link manually.'); }
});
function openUrl(url: string) {
  void browser.tabs.create({url}).catch(() => status('Unable to open the page.'));
}
button('open').addEventListener('click', () => { if (currentUrl) openUrl(currentUrl); });
button('official').addEventListener('click', () => {
  const message = element('claim-status');
  message.hidden = true;
  void browser.tabs.create({url: OFFER_URL}).catch(() => {
    message.textContent = 'Unable to open the offer page. Please try again.';
    message.hidden = false;
  });
});
button('github').addEventListener('click', () => openUrl('https://github.com/hoangsvit/chatgpt-offer-toolkit'));

button('eplus').addEventListener('click', () => openUrl(EPLUS_URL));
button('telegram').addEventListener('click', () => openUrl(SUPPORT_URL));
const bannerEnabled = field('banner-enabled');
const bannerPosition = element<HTMLSelectElement>('banner-position');
const bannerDismiss = element<HTMLSelectElement>('banner-dismiss');
const bannerReset = button('banner-reset');
let bannerSettings = normalizeSettings(undefined);
let saving = false;
function renderBannerSettings() {
  bannerEnabled.checked = bannerSettings.enabled;
  bannerEnabled.disabled = saving;
  bannerPosition.value = bannerSettings.position;
  bannerDismiss.value = bannerSettings.dismiss;
  bannerPosition.disabled = saving || !bannerSettings.enabled;
  bannerDismiss.disabled = saving || !bannerSettings.enabled;
  bannerReset.disabled = saving;
}
function bannerMessage(value: string) {
  const node = element('banner-status');
  node.textContent = value;
  node.hidden = !value;
}
async function loadBannerSettings() {
  saving = true;
  renderBannerSettings();
  try {
    const data = await browser.storage.local.get(BANNER_KEY);
    bannerSettings = normalizeSettings(data[BANNER_KEY]);
  } catch { bannerMessage('Unable to load banner settings.'); }
  finally { saving = false; renderBannerSettings(); }
}
async function saveBannerSettings(patch: Partial<BannerSettings>) {
  if (saving) return;
  saving = true;
  renderBannerSettings();
  try {
    const latest = await browser.storage.local.get(BANNER_KEY);
    const next = normalizeSettings({...normalizeSettings(latest[BANNER_KEY]), ...patch});
    await browser.storage.local.set({[BANNER_KEY]: next});
    bannerSettings = next;
    bannerMessage('Saved. Changes apply to open ChatGPT tabs.');
  } catch { bannerMessage('Unable to save banner settings.'); }
  finally { saving = false; renderBannerSettings(); }
}
bannerEnabled.addEventListener('change', () => void saveBannerSettings({enabled:bannerEnabled.checked, ...(bannerEnabled.checked ? {hiddenUntil:0} : {})}));
bannerPosition.addEventListener('change', () => void saveBannerSettings({position:bannerPosition.value === 'floating' ? 'floating' : 'top'}));
bannerDismiss.addEventListener('change', () => void saveBannerSettings({dismiss:bannerDismiss.value === 'week' ? 'week' : bannerDismiss.value === 'forever' ? 'forever' : 'day'}));
bannerReset.addEventListener('click', () => void saveBannerSettings({enabled:true,hiddenUntil:0}));
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[BANNER_KEY]) {
    bannerSettings = normalizeSettings(changes[BANNER_KEY].newValue);
    renderBannerSettings();
  }
});
void loadBannerSettings();

import { UPDATE_KEY, AUTO_KEY, CHECK_MESSAGE, normalizeUpdate, isNewer, releasePage } from '../../utils/updates';
import type { UpdateState } from '../../utils/updates';

const currentVersion = browser.runtime.getManifest().version;
let updateState: UpdateState = normalizeUpdate(undefined);
let checkingUpdate = false;
let updateAuto = true;
element('update-current').textContent = 'v' + currentVersion;
element('update-note').textContent = import.meta.env.FIREFOX
  ? 'Firefox can install updates automatically for signed self-distributed builds. Temporary builds must be reloaded manually.'
  : 'Download the new ZIP, extract into the existing extension directory, then reload in the browser.';
function renderUpdate() {
  const newer = isNewer(updateState.latest,currentVersion);
  element('update-latest').textContent = updateState.latest ? 'v'+updateState.latest : '—';
  element('update-dot').hidden = !newer;
  button('update-download').hidden = !newer;
  button('update-check').disabled = checkingUpdate;
  field('update-auto').checked = updateAuto;
  element('update-state').textContent = checkingUpdate ? 'Checking GitHub Releases…' :
    updateState.error ?? (newer ? 'Update available.' : updateState.latest ? 'You are up to date.' : updateState.checkedAt ? 'No stable release yet.' : 'Not checked yet.') +
    (updateState.checkedAt ? ' · '+new Date(updateState.checkedAt).toLocaleString() : '');
}
async function loadUpdates() {
  try {
    const s = await browser.storage.local.get([UPDATE_KEY,AUTO_KEY]);
    updateState = normalizeUpdate(s[UPDATE_KEY]); updateAuto = s[AUTO_KEY] !== false;
    field('update-auto').disabled = false;
    if(isNewer(updateState.latest,currentVersion)) element<HTMLDetailsElement>('update-center').open = true;
  } catch { updateState.error = 'Unable to load update settings.'; }
  renderUpdate();
}
button('update-check').addEventListener('click',async()=>{
  if(checkingUpdate) return;
  checkingUpdate=true;renderUpdate();
  try { updateState=normalizeUpdate(await browser.runtime.sendMessage(CHECK_MESSAGE)); }
  catch {updateState={...updateState,error:'Unable to check for updates.'};}
  finally {checkingUpdate=false;renderUpdate();}
});
field('update-auto').addEventListener('change',async()=>{
  const control = field('update-auto'); const wanted=control.checked; control.disabled=true;
  try {await browser.storage.local.set({[AUTO_KEY]:wanted});updateAuto=wanted;}
  catch {updateState.error='Unable to save automatic check setting.';}
  finally {control.disabled=false;renderUpdate();}
});
button('update-download').addEventListener('click',()=>openUrl(releasePage(updateState.latest)));
browser.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local')return;
  if(changes[UPDATE_KEY])updateState=normalizeUpdate(changes[UPDATE_KEY].newValue);
  if(changes[AUTO_KEY])updateAuto=changes[AUTO_KEY].newValue!==false;
  if(changes[UPDATE_KEY]||changes[AUTO_KEY])renderUpdate();
});
void loadUpdates();
