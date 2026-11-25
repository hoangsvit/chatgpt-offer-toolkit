export const RELEASES_URL = 'https://github.com/hoangsvit/chatgpt-offer-toolkit/releases';
export const RELEASE_API = 'https://api.github.com/repos/hoangsvit/chatgpt-offer-toolkit/releases/latest';
export const UPDATE_KEY = 'offerToolkitUpdate';
export const AUTO_KEY = 'offerToolkitAutoUpdate';
export const CHECK_MESSAGE = 'offer-toolkit:check-updates';
export const ALARM_NAME = 'offer-toolkit-update-check';
export interface UpdateState { latest: string | null; checkedAt: number; error: string | null; }
type Version = readonly [number, number, number];
export function parseVersion(value: unknown): Version | null {
  if(typeof value !== 'string' || !/^v?(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.test(value)) return null;
  const [major, minor, patch] = value.replace(/^v/,'').split('.');
  if (major === undefined || minor === undefined || patch === undefined) return null;
  return [Number(major), Number(minor), Number(patch)];
}
export function isNewer(latest: unknown, current: unknown): boolean {
  const a = parseVersion(latest), b = parseVersion(current);
  if(!a || !b) return false;
  for (const i of [0, 1, 2] as const) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}
export function releaseVersion(input: unknown): string | null {
  if(!input || typeof input !== 'object') return null;
  const r = input as {tag_name?: unknown; draft?: unknown; prerelease?: unknown};
  return r.draft === false && r.prerelease === false && parseVersion(r.tag_name) ? String(r.tag_name).replace(/^v/,'') : null;
}
export function normalizeUpdate(input: unknown): UpdateState {
  const x = input && typeof input === 'object' ? input as Partial<UpdateState> : {};
  return {latest:parseVersion(x.latest) ? String(x.latest).replace(/^v/,'') : null, checkedAt: typeof x.checkedAt === 'number' && Number.isFinite(x.checkedAt) && x.checkedAt > 0 ? x.checkedAt : 0, error: typeof x.error === 'string' ? x.error : null};
}
export function releasePage(version: unknown): string {
  return parseVersion(version) ? RELEASES_URL + '/tag/v' + String(version).replace(/^v/,'') : RELEASES_URL;
}
