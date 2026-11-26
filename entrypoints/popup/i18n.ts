import { browser } from 'wxt/browser';

const i18n = browser.i18n as { getMessage(key: string): string } | undefined;

export function translate(message: string): string {
  const key = message.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return (key && i18n?.getMessage(key)) || message;
}

export const uiLocale = i18n?.getMessage('locale_name') || 'en';

export function localizePopup() {
  document.documentElement.lang = uiLocale;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const original = node.nodeValue ?? '';
    const label = original.trim().replace(/^·\s*|\s*[·↗]$/g, '');
    if (label) node.nodeValue = original.replace(label, () => label.split(' · ').map(translate).join(' · '));
  }
  for (const element of document.querySelectorAll('[aria-label], [title]')) {
    for (const attribute of ['aria-label', 'title']) {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, translate(value));
    }
  }
}
