import { browser } from 'wxt/browser';
import { validateConfig, validCheckoutUrl, requestCheckout } from '../../utils/checkout';
import type { CheckoutConfig, CheckoutResult } from '../../utils/checkout';
import './style.css';
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
let currentUrl: string | null = null;
let busy = false;
let tabReady = false;

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
  element('connection-text').textContent = ready ? 'ChatGPT tab ready · sign-in checked on request' : 'Open ChatGPT to use advanced checkout';
  generate.disabled = busy || !tabReady;
}
async function checkConnection() {
  try { renderConnection((await getActiveChatGPTTab()) !== null); }
  catch { renderConnection(false); }
}
void checkConnection();

element<HTMLFormElement>('settings').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  resetResult();
  let config: CheckoutConfig;
  try {
    config = validateConfig({workspace:field('workspace').value,seats:seats.value,country:field('country').value,currency:field('currency').value});
  } catch (error) { status(error instanceof Error ? error.message : 'Invalid settings.'); return; }
  busy = true;
  generate.disabled = true;
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
    if (!currentUrl) { status('Unexpected checkout URL blocked.'); return; }
    field('link').value = currentUrl;
    element('result').hidden = false;
    status('Link generated. This does not confirm a free offer. Review the official checkout.');
  } catch { status('Unable to access the ChatGPT tab. Reopen the extension and try again.'); }
  finally {
    busy = false;
    generate.disabled = !tabReady;
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
