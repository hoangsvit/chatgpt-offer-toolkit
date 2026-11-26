import { browser } from 'wxt/browser';
import { validateConfig, validCheckoutUrl, requestCheckout } from '../../utils/checkout';
import type { CheckoutConfig, CheckoutResult } from '../../utils/checkout';
import './style.css';
import { mountBeui, enhanceFormControls, syncBeuiSwitches, syncBillingSelects } from './beui/islands';
import { reviewCheckoutPrice } from '../../utils/checkout-price';
import type { PriceReview } from '../../utils/checkout-price';
import { CHECK_POPUP_MESSAGE, isChatGPTUrl } from '../../utils/eligibility-badge';
import type { EligibilityResult } from '../../utils/eligibility';
import { currencyForCountry, BILLING_PREFERENCE_KEY, parseBillingPreference } from '../../utils/billing-locale';
import { OFFER_URL, EPLUS_URL, SUPPORT_URL } from '../../utils/links';
import { localizePopup, translate, uiLocale } from './i18n';
import { mountSettingsCards, openCheckoutPreferences } from './beui/settings-cards';

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error('Missing UI element: ' + id);
  return node as T;
}
const field = (id: string) => element<HTMLInputElement>(id);
const button = (id: string) => element<HTMLButtonElement>(id);
localizePopup();
mountSettingsCards();
enhanceFormControls();
const generate = button('generate');
function showView(view:'offer'|'settings') {
  const isOffer=view==='offer';
  const changed=element('offer-view').hidden===isOffer;
  element('offer-view').hidden=!isOffer;
  element('settings-view').hidden=isOffer;
  button('view-offer').setAttribute('aria-pressed',String(isOffer));
  button('view-settings').setAttribute('aria-pressed',String(!isOffer));
  button('view-offer').hidden=isOffer;
  button('view-settings').hidden=!isOffer;
  if (changed) window.scrollTo(0,0);
}
button('view-offer').addEventListener('click',()=>showView('offer'));
button('view-settings').addEventListener('click',()=>showView('settings'));
mountBeui(() => {
  const form=element<HTMLFormElement>('settings');
  if(!form.checkValidity()) {
    showView('settings');
    openCheckoutPreferences();
    const invalid = form.querySelector<HTMLInputElement>('input:invalid');
    if (invalid?.id === 'country' || invalid?.id === 'currency') {
      billingHint.textContent = translate('Select your billing country and currency before continuing.');
      invalid.nextElementSibling?.querySelector('button')?.focus();
    } else form.reportValidity();
    return;
  }
  form.requestSubmit();
});
const seats = field('seats');
const countryField = field('country');
const currencyField = field('currency');
const billingHint = element('billing-suggestion');
const rememberBilling = field('remember-billing');
// A language preference (including en-US) is not proof of billing country.
let savedBilling: ReturnType<typeof parseBillingPreference> = null;
let billingEdited = false;

async function loadBillingPreference() {
  try {
    const data = await browser.storage.local.get(BILLING_PREFERENCE_KEY);
    savedBilling = parseBillingPreference(data[BILLING_PREFERENCE_KEY]);
    if (savedBilling) {
      countryField.value = savedBilling.country;
      currencyField.value = savedBilling.currency;
      syncBillingSelects();
      rememberBilling.checked = true;
      billingHint.textContent = translate('Saved billing preference. Confirm it still matches your actual billing details.');
    } else {
      billingHint.textContent = translate('Select your actual billing country. Its local currency will be suggested.');
    }
    syncBeuiSwitches();
  } catch { /* ignore */ }
}
void loadBillingPreference();

function forgetBilling() {
  savedBilling = null;
  void browser.storage.local.remove(BILLING_PREFERENCE_KEY).catch(() => {});
  rememberBilling.checked = false;
  syncBeuiSwitches();
}
rememberBilling.addEventListener('change', () => {
  if (!rememberBilling.checked) forgetBilling();
});
currencyField.addEventListener('input', () => { billingEdited = true; });
countryField.addEventListener('input', () => {
  billingEdited = true;
  currencyField.value = currencyForCountry(countryField.value) ?? '';
  syncBillingSelects();
  billingHint.textContent = translate('Currency is a local suggestion. Verify the currency supported by ChatGPT.');
});
let currentUrl: string | null = null;
let busy = false;
let tabReady = false;
let eligibilityBusy = false;
let eligibleTabId: number | null = null;
const eligibilityButton = button('eligibility-check');

element('version').textContent = 'v' + browser.runtime.getManifest().version;
function status(message: string) {
  const node = element('status');
  node.textContent = translate(message);
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
let accountLabel: string | undefined;
function renderConnection(ready: boolean) {
  tabReady = ready;
  if (!ready) {
    accountLabel = undefined;
    eligibleTabId = null;
  }
  element('connection').dataset.state = ready ? 'ready' : 'unavailable';
  const connected = translate('Connected to ChatGPT');
  element('connection-text').textContent = ready
    ? connected + (accountLabel ? ' · ' + accountLabel : '')
    : translate('Open chatgpt.com to generate a checkout link');
  generate.disabled = busy || !tabReady || eligibilityBusy || eligibleTabId === null;
  const hint = element('checkout-eligibility-hint');
  hint.hidden = !tabReady || busy || eligibilityBusy || eligibleTabId !== null;
  generate.dataset.tooltip = busy ? translate('Generating…') : !tabReady
    ? translate('Open chatgpt.com to generate a checkout link') : eligibilityBusy
      ? translate('Checking…') : hint.hidden ? translate('Create a checkout link with your current settings.') : hint.textContent ?? '';
  eligibilityButton.disabled = busy || !tabReady || eligibilityBusy;
}
function renderEligibility(value: EligibilityResult | undefined) {
  const state = element('eligibility-state');
  const labels = {eligible:'Coupon eligible',not_eligible:'Not eligible',unknown:'Unknown',redeemed:'Already redeemed'};
  state.dataset.state = value?.state ?? 'unknown';
  state.textContent = translate(value?.state === 'unknown' && value.campaign === 'not_listed'
    ? 'Offer not listed' : value ? labels[value.state] : 'Unknown');
  element('eligibility-plan').textContent = value?.plan ? value.plan.charAt(0).toUpperCase() + value.plan.slice(1) : '—';
  element('eligibility-reason').textContent = translate(value?.reason ?? 'No verified response. Review the official offer page.');
}
async function runEligibilityCheck(force = false) {
  if (busy || eligibilityBusy) return;
  eligibilityBusy = true;
  eligibleTabId = null;
  resetResult();
  accountLabel = undefined;
  eligibilityButton.disabled = true;
  generate.disabled = true;
  generate.dataset.tooltip = translate('Checking…');
  eligibilityButton.textContent = translate('Checking…');
  renderEligibility({state:'unknown',plan:null,campaign:'unknown',reason:'Checking your current personal workspace…'});
  element('eligibility-state').textContent = translate('Checking…');
  try {
    const tabId = await getActiveChatGPTTab();
    renderConnection(tabId !== null);
    if (tabId === null) {
      renderEligibility({state:'unknown',plan:null,campaign:'unknown',reason:'Open chatgpt.com and reopen this popup to check eligibility.'});
      element('eligibility-state').textContent = translate('Not checked');
      return;
    }
    const result = await browser.runtime.sendMessage({type:CHECK_POPUP_MESSAGE,tabId,force}) as EligibilityResult | undefined;
    if (result?.state === 'eligible' && result.campaign === 'assigned') eligibleTabId = tabId;
    accountLabel = result?.accountLabel;
    renderEligibility(result);
    const detected = result?.detectedCountry;
    if (typeof detected === 'string' && /^[A-Z]{2}$/.test(detected) && !['ZZ','EU','XX'].includes(detected)) {
      if (!billingEdited && !savedBilling) {
        countryField.value = detected;
        currencyField.value = currencyForCountry(detected) ?? '';
        syncBillingSelects();
        billingHint.textContent = 'Suggested from ChatGPT session: '+detected+'. Confirm actual billing country and supported currency.';
        resetResult();
      } else if (countryField.value.trim().toUpperCase() !== detected) {
        billingHint.textContent = 'ChatGPT session suggests '+detected+'. Verify your selected billing country.';
      }
    }
  } catch { renderEligibility(undefined); }
  finally {
    eligibilityBusy = false;
    eligibilityButton.textContent = translate('Check again');
    renderConnection(tabReady);
  }
}
eligibilityButton.addEventListener('click', () => void runEligibilityCheck(true));
// Reuse the current tab's automatic eligibility check; no checkout.
void runEligibilityCheck();

let priceBusy = false;
async function runPriceReview() {
  if (priceBusy) return;
  priceBusy = true;
  button('price-check').disabled = true;
  const state = element('price-state');
  const amount = element('price-amount');
  const reason = element('price-reason');
  state.textContent = translate('Checking…'); state.dataset.state = 'unknown'; amount.textContent = '—';
  try {
    const [tab] = await browser.tabs.query({active:true,currentWindow:true});
    const url = tab?.url ? new URL(tab.url) : null;
    if (tab?.id == null || !url || !(url.origin === 'https://chatgpt.com' && /^\/(checkout|payments\/checkout)(\/|$)/.test(url.pathname))) {
      element('price-panel').hidden = true;
      state.textContent = translate('Price unknown');
      reason.textContent = translate('Open a checkout on chatgpt.com. External payment pages are not read by this extension.');
      return;
    }
    const panel=element<HTMLDetailsElement>('price-panel');
    panel.hidden=false;
    const [response] = await browser.scripting.executeScript({target:{tabId:tab.id},func:reviewCheckoutPrice});
    const result = response?.result as PriceReview | undefined;
    state.textContent = translate(result?.state === 'zero' ? 'Zero due today' : result?.state === 'paid' ? 'Paid checkout' : 'Price unknown');
    state.dataset.state = result?.state === 'zero' ? 'eligible' : result?.state === 'paid' ? 'not_eligible' : 'unknown';
    amount.textContent = result?.amount ?? '—';
    reason.textContent = translate(result?.reason ?? 'No readable price. Review the official checkout manually.');
  } catch {
    state.textContent = translate('Price unknown');
    reason.textContent = translate('Unable to read this checkout. Review the official total manually.');
  } finally {
    priceBusy = false;
    button('price-check').disabled = false;
  }
}
button('price-check').addEventListener('click', () => void runPriceReview());
void runPriceReview();

element<HTMLFormElement>('settings').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || eligibilityBusy || eligibleTabId === null) return;
  showView('offer');
  resetResult();
  let config: CheckoutConfig;
  try {
    config = validateConfig({workspace:field('workspace').value,seats:seats.value,country:field('country').value,currency:field('currency').value});
  } catch (error) { status(error instanceof Error ? error.message : 'Invalid settings.'); return; }
  busy = true;
  generate.disabled = true;
  generate.dataset.tooltip = translate('Generating…');
  eligibilityButton.disabled = true;
  element('generate-label').textContent = translate('Generating…');
  const controls = ['workspace','seats','country','currency','minus','plus','remember-billing'];
  for (const id of controls) element<HTMLInputElement | HTMLButtonElement>(id).disabled = true;
  status('Requesting checkout from your current ChatGPT session…');
  try {
    const tabId = await getActiveChatGPTTab();
    renderConnection(tabId !== null);
    if (tabId === null) { status('Open chatgpt.com, sign in, and reopen the extension.'); return; }
    if (tabId !== eligibleTabId) {
      eligibleTabId = null;
      status('Check offer eligibility in the current ChatGPT tab before generating checkout.');
      return;
    }
    const [response] = await browser.scripting.executeScript({target:{tabId},func:requestCheckout,args:[config]});
    const result = response?.result as CheckoutResult | undefined;
    if (!result?.url) {
      if (result?.code === 'billing_country_mismatch') {
        forgetBilling();
        billingEdited = true;
        showView('settings');
        openCheckoutPreferences();
        billingHint.textContent = translate('Saved billing preference cleared. Correct the actual country and currency before trying again.');
      }
      status(result?.error || 'No checkout response received.');
      return;
    }
    currentUrl = validCheckoutUrl(result.url);
    if (!currentUrl) { status('Checkout returned an unrecognized or insecure URL. Use the official offer page instead.'); return; }
    if (rememberBilling.checked) {
      try {
        await browser.storage.local.set({
          [BILLING_PREFERENCE_KEY]: {country: config.country, currency: config.currency}
        });
      } catch { /* storage is optional */ }
    }
    field('link').value = currentUrl;
    element('result').hidden = false;
    if (result.total) {
      const {currency, minorUnits} = result.total;
      const zeroDecimal = new Set([
        'BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF',
        'UGX','VND','VUV','XAF','XOF','XPF'
      ]);
      const digits = zeroDecimal.has(currency) ? 0 : 2;
      const displayed = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      }).format(minorUnits / 10 ** digits);
      status(minorUnits === 0
        ? 'Server-reported current total: '+displayed+'. Review the official checkout, renewal price and terms; activation is not verified.'
        : 'Paid checkout — server-reported current total: '+displayed+'. Review the official checkout before subscribing.');
    } else {
      status('Link generated. Server total unavailable. Review the official checkout; a free offer is not verified.');
    }
  } catch { status('Unable to access the ChatGPT tab. Reopen the extension and try again.'); }
  finally {
    busy = false;
    renderConnection(tabReady);
    element('generate-label').textContent = translate('Generate checkout link');
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
    message.textContent = translate('Unable to open the offer page. Please try again.');
    message.hidden = false;
  });
});
button('github').addEventListener('click', () => openUrl('https://github.com/hoangsvit/chatgpt-offer-toolkit'));

button('eplus').addEventListener('click', () => openUrl(EPLUS_URL));
button('telegram').addEventListener('click', () => openUrl(SUPPORT_URL));
import { UPDATE_KEY, AUTO_KEY, CHECK_MESSAGE, AUTO_CHECK_MESSAGE, normalizeUpdate, isNewer, releasePage } from '../../utils/updates';
import type { UpdateState } from '../../utils/updates';

const currentVersion = browser.runtime.getManifest().version;
let updateState: UpdateState = normalizeUpdate(undefined);
let checkingUpdate = false;
let updateAuto = true;
element('update-current').textContent = 'v' + currentVersion;
element('update-note').textContent = translate(import.meta.env.FIREFOX
  ? 'Firefox can install updates automatically for signed self-distributed builds. Temporary builds must be reloaded manually.'
  : 'Download the new ZIP, extract into the existing extension directory, then reload in the browser.');
function renderUpdate() {
  const newer = isNewer(updateState.latest,currentVersion);
  element('update-latest').textContent = updateState.latest ? 'v'+updateState.latest : '—';
  element('update-dot').hidden = !newer;
  element('nav-update-dot').hidden = !newer;
  button('update-download').hidden = !newer;
  button('update-check').disabled = checkingUpdate;
  field('update-auto').checked = updateAuto;
  syncBeuiSwitches();
  const message = checkingUpdate ? 'Checking GitHub Releases…' :
    updateState.error ?? (newer ? 'Update available' : updateState.latest ? 'You are up to date.' : updateState.checkedAt ? 'No stable release yet.' : 'Not checked yet.');
  element('update-state').textContent = translate(message) +
    (!checkingUpdate && updateState.checkedAt ? ' · '+new Date(updateState.checkedAt).toLocaleString(uiLocale) : '');
}
async function loadUpdates() {
  try {
    const s = await browser.storage.local.get([UPDATE_KEY,AUTO_KEY]);
    updateState = normalizeUpdate(s[UPDATE_KEY]); updateAuto = s[AUTO_KEY] !== false;
    field('update-auto').disabled = false;
    const [tab] = await browser.tabs.query({active:true,currentWindow:true});
    if(updateAuto && isChatGPTUrl(tab?.url)) updateState=normalizeUpdate(await browser.runtime.sendMessage(AUTO_CHECK_MESSAGE));
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
