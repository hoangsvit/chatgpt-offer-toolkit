import { browser } from 'wxt/browser';
import { validateConfig, validCheckoutUrl, requestCheckout } from '../../utils/checkout';
import type { CheckoutConfig, CheckoutResult } from '../../utils/checkout';
import './style.css';

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
  element('connection-text').textContent = ready ? 'ChatGPT tab ready · sign-in checked on request' : 'Open chatgpt.com to continue';
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
button('official').addEventListener('click', () => openUrl('https://chatgpt.com/?promo_campaign=team-1-month-free#pricing'));
button('github').addEventListener('click', () => openUrl('https://github.com/hoangsvit/chatgpt-offer-toolkit'));
