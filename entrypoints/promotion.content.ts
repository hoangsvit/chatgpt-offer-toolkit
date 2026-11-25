import { defineContentScript } from 'wxt/utils/define-content-script';
import { browser } from 'wxt/browser';
import { BANNER_KEY, OFFER_URL, EPLUS_URL, SUPPORT_URL, normalizeSettings, isVisible, dismissalDeadline } from '../utils/banner-settings';

import { UPDATE_KEY, normalizeUpdate, isNewer, releasePage, AUTO_CHECK_MESSAGE } from '../utils/updates';

const STYLE = `
:host{all:initial;display:block;position:fixed;top:72px;right:16px;width:min(360px,calc(100vw - 32px));max-width:calc(100vw - 32px);box-sizing:border-box;z-index:10000;isolation:isolate;color-scheme:light;--bg:#eaf7ef;--text:#145d40;--muted:#39745a;--border:#c9e4d6;--accent:#146d4b;font:13px/1.4 system-ui,sans-serif}
:host([data-dark]){color-scheme:dark;--bg:#203c30;--text:#c4f4d9;--muted:#a5cfb9;--border:#385d4b;--accent:#146d4b}
*{box-sizing:border-box}.banner{display:flex;align-items:center;gap:12px;padding:9px 16px;background:var(--bg);border:1px solid var(--border);border-radius:12px;box-shadow:0 4px 20px #0002;flex-wrap:wrap;color:var(--text)}.gift{width:26px;height:26px;flex-shrink:0}.copy{flex:1;min-width:0;overflow-wrap:anywhere}.title{display:block;font-weight:700;font-size:14px}.meta{display:flex;align-items:center;flex-wrap:wrap;gap:4px;font-size:11px;color:var(--muted)}a{color:inherit}a:hover{text-decoration:underline}.claim{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;white-space:nowrap;background:var(--accent);color:#fff;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700}.close{border:0;background:transparent;color:var(--text);font:22px/1 system-ui;cursor:pointer;padding:6px;flex-shrink:0}.close:hover{opacity:.7}a:focus-visible,button:focus-visible{outline:2px solid currentColor;outline-offset:3px}
:host([data-position="floating"]){top:auto;right:16px;bottom:112px;width:min(300px,calc(100vw - 32px));z-index:10000}:host([data-position="floating"]) .banner{flex-wrap:wrap;border:1px solid var(--border);border-radius:14px;box-shadow:0 10px 35px #0002;padding:14px}:host([data-position="floating"]) .copy{flex-basis:70%}:host([data-position="floating"]) .claim{order:4;width:100%}
@media(max-width:520px){:host{top:64px;right:8px;width:min(300px,calc(100vw - 16px));max-width:calc(100vw - 16px)}:host([data-position="floating"]){top:auto;right:8px;width:min(300px,calc(100vw - 16px))}.banner{flex-wrap:wrap;padding:8px 10px;gap:7px}.gift{width:22px;height:22px}.title{font-size:12px}.claim{font-size:11px;padding:7px 9px}.meta{font-size:10px}:host([data-position="floating"]){bottom:100px}}
`;
const HOST_ID = 'eplus-offer-toolkit-banner';
function makeLink(label: string, url: string, className = '') {
  const a = document.createElement('a');
  a.textContent = label;
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.className = className;
  return a;
}
export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  runAt: 'document_idle',
  main(ctx) {
    if (window.top !== window) return;
    // Independent of banner visibility: only the background can decide whether an update check is due.
    void browser.runtime.sendMessage(AUTO_CHECK_MESSAGE).catch(()=>{});
    let settings = normalizeSettings(undefined);
    let loaded = false;
    let update = normalizeUpdate(undefined);
    let updateLink: HTMLAnchorElement | null = null;
    let host: HTMLElement | null = null;
    let dismissTimer: number | undefined;
    let stopped = false;
    let queued = false;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    function theme() {
      const root = document.documentElement;
      const explicit = root.getAttribute('data-theme');
      const dark = explicit === 'dark' || root.classList.contains('dark') || (explicit !== 'light' && !root.classList.contains('light') && media.matches);
      host?.toggleAttribute('data-dark', dark);
    }
    function remove() { host?.remove(); host = null; updateLink = null; }
    function renderUpdate() {
      if(!updateLink) return;
      const newer = isNewer(update.latest,browser.runtime.getManifest().version);
      updateLink.hidden = !newer;
      updateLink.textContent = newer ? 'Update v'+update.latest+' ↗' : '';
      updateLink.href = releasePage(update.latest);
    }
    function build() {
      const node = document.createElement('div');
      node.id = HOST_ID;
      const shadow = node.attachShadow({mode:'closed'});
      const style = document.createElement('style'); style.textContent = STYLE;
      const banner = document.createElement('aside'); banner.className = 'banner'; banner.setAttribute('aria-label','Promotion from ePlus.DEV browser extension');
      const gift = document.createElement('span'); gift.className = 'gift'; gift.textContent = '🎁'; gift.setAttribute('aria-hidden','true');
      const copy = document.createElement('div'); copy.className = 'copy';
      const title = document.createElement('strong'); title.className = 'title'; title.textContent = 'ChatGPT Business — 1 month free';
      const meta = document.createElement('div'); meta.className = 'meta';
      meta.append('Eligibility applies · Extension by ',makeLink('ePlus.DEV',EPLUS_URL),' · ',makeLink('Telegram',SUPPORT_URL));
      updateLink = makeLink('',releasePage(update.latest));
      updateLink.hidden = true;
      meta.append(updateLink);
      copy.append(title,meta);
      const claim = makeLink('Claim offer ↗',OFFER_URL,'claim');
      const close = document.createElement('button'); close.className = 'close'; close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label','Dismiss promotion banner');
      close.addEventListener('click', async () => {
        const hiddenUntil = dismissalDeadline(settings.dismiss);
        settings = {...settings,hiddenUntil}; render();
        try {
          const latest = await browser.storage.local.get(BANNER_KEY);
          await browser.storage.local.set({[BANNER_KEY]:{...normalizeSettings(latest[BANNER_KEY]),hiddenUntil}});
        } catch { /* keep dismissed in this tab */ }
      });
      banner.append(gift,copy,claim,close); shadow.append(style,banner);
      return node;
    }
    function render() {
      if (stopped || !loaded) return;
      if (dismissTimer !== undefined) { window.clearTimeout(dismissTimer); dismissTimer = undefined; }
      if (!isVisible(settings)) {
        remove();
        const remaining = settings.hiddenUntil-Date.now();
        if(settings.enabled && remaining>0 && settings.hiddenUntil!==Number.MAX_SAFE_INTEGER) dismissTimer=window.setTimeout(render,Math.min(remaining+20,2147483647));
        return;
      }
      if (!document.body) return;
      if (!host?.isConnected) {
        document.getElementById(HOST_ID)?.remove();
        host = build();
        // Both positions are fixed overlays. Never insert an in-flow element before the app root.
        host.style.setProperty('position','fixed','important');
        document.body.append(host);
      }
      host.dataset.position = settings.position;
      theme(); renderUpdate();
    }
    function queueRender() {
      if (queued || stopped) return;
      queued = true;
      queueMicrotask(() => {queued=false; if(loaded && isVisible(settings) && !host?.isConnected) render();});
    }
    const bodyObserver = new MutationObserver(queueRender);
    bodyObserver.observe(document.documentElement,{childList:true,subtree:true});
    const themeObserver = new MutationObserver(theme);
    themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class','data-theme']});
    media.addEventListener('change',theme);
    const listener: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, area) => {
      if(area==='local' && changes[UPDATE_KEY]) {update=normalizeUpdate(changes[UPDATE_KEY].newValue);renderUpdate();}
      if(area==='local' && changes[BANNER_KEY]) {settings=normalizeSettings(changes[BANNER_KEY].newValue);loaded=true;render();}
    };
    browser.storage.onChanged.addListener(listener);
    void browser.storage.local.get([BANNER_KEY,UPDATE_KEY]).then(data => {
      update=normalizeUpdate(data[UPDATE_KEY]);renderUpdate();
      if(!loaded) {settings=normalizeSettings(data[BANNER_KEY]);loaded=true;render();}
    }).catch(()=>{ /* fail closed if storage unavailable */ });
    ctx.onInvalidated(() => {
      stopped=true; bodyObserver.disconnect(); themeObserver.disconnect(); media.removeEventListener('change',theme);
      browser.storage.onChanged.removeListener(listener);
      if(dismissTimer!==undefined) window.clearTimeout(dismissTimer);
      remove();
    });
  },
});
