export type BannerSettings = {
  enabled: boolean;
  position: 'top' | 'floating';
  dismiss: 'day' | 'week' | 'forever';
  hiddenUntil: number;
};
export const BANNER_KEY = 'offerToolkitBanner';
export const OFFER_URL = 'https://chatgpt.com/?promo_campaign=team-1-month-free#pricing';
export const EPLUS_URL = 'https://eplus.dev';
export const SUPPORT_URL = 'https://t.me/eplus_news';
export const defaults: BannerSettings = {enabled:true,position:'top',dismiss:'day',hiddenUntil:0};
export function normalizeSettings(input: unknown): BannerSettings {
  const v = input && typeof input === 'object' ? input as Partial<BannerSettings> : {};
  return {
    enabled: typeof v.enabled === 'boolean' ? v.enabled : defaults.enabled,
    position: v.position === 'floating' ? 'floating' : 'top',
    dismiss: v.dismiss === 'week' || v.dismiss === 'forever' ? v.dismiss : 'day',
    hiddenUntil: typeof v.hiddenUntil === 'number' && Number.isFinite(v.hiddenUntil) && v.hiddenUntil >= 0 ? v.hiddenUntil : 0,
  };
}
export function isVisible(s: BannerSettings, now = Date.now()): boolean {
  return s.enabled && s.hiddenUntil <= now;
}
export function dismissalDeadline(mode: BannerSettings['dismiss'], now = Date.now()): number {
  return mode === 'forever' ? Number.MAX_SAFE_INTEGER : now + (mode === 'week' ? 7 : 1) * 86400000;
}
