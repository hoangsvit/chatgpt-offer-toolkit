const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules = {}, globals = {}) {
  const source = ts.transpileModule(
    fs.readFileSync(file, 'utf8').replace('import.meta.env.FIREFOX', 'firefox'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, URL, require: name => modules[name], ...globals });
  return exports;
}

const messages = load('utils/eligibility-badge.ts');
const eligible = { state: 'eligible', plan: 'plus', campaign: 'assigned', reason: 'Synthetic eligibility' };
const denied = { state: 'not_eligible', plan: 'plus', campaign: 'assigned', reason: 'Synthetic denial' };
const settle = () => new Promise(resolve => setImmediate(resolve));

function harness({ check, page, tab = {}, firefox = false }) {
  const listeners = [];
  const badges = new Map();
  const calls = [];
  let activate, update;
  const trackedTab = { url: 'https://chatgpt.com/', ...tab };
  const ignore = { addListener() {} };
  const browser = {
    runtime: { id: 'test', onMessage: { addListener: listener => listeners.push(listener) }, onInstalled: ignore, onStartup: ignore },
    storage: { local: { get: async () => ({ disabled: false, state: { checkedAt: Date.now() } }) }, onChanged: ignore },
    alarms: { get: async () => ({}), onAlarm: ignore },
    tabs: {
      get: async () => trackedTab,
      query: async () => [],
      sendMessage: async (_tabId, message) => {
        if (!page) throw new Error('No receiver');
        return message.type === messages.BADGE_MESSAGE ? { result: page } : page;
      },
      onUpdated: { addListener: listener => { update = listener; } },
      onActivated: { addListener: listener => { activate = listener; } },
      onRemoved: ignore,
    },
    windows: { onFocusChanged: ignore },
    action: {
      async setBadgeBackgroundColor() {},
      async setTitle() {},
      async setBadgeText({ tabId, text }) { badges.set(tabId, text); },
    },
    scripting: { executeScript: async ({ target, func }) => {
      assert.equal(target.tabId, 1);
      return [{ result: await func() }];
    } },
  };
  load('entrypoints/background.ts', {
    'wxt/utils/define-background': { defineBackground: main => main() },
    'wxt/browser': { browser },
    '../utils/updates': {
      AUTO_KEY: 'disabled', UPDATE_KEY: 'state', CHECK_MESSAGE: 'update', AUTO_CHECK_MESSAGE: 'auto-update',
      normalizeUpdate: state => state,
    },
    '../utils/eligibility-badge': messages,
    '../utils/eligibility': { checkOfferEligibility: context => {
      calls.push(context ?? 'tab');
      return check();
    } },
  }, { firefox });
  return {
    calls,
    badge: () => badges.get(1),
    activate: () => activate({ tabId: 1 }),
    navigate(url) {
      trackedTab.url = url;
      update(1, { status: 'loading' }, trackedTab);
    },
    popup(force = false) {
      const message = { type: messages.CHECK_POPUP_MESSAGE, tabId: 1, force };
      return new Promise(resolve => assert.ok(listeners.some(listener => listener(message, { id: 'test' }, resolve))));
    },
  };
}

test('popup and badge share one fallback API request, cache it and refresh explicitly', async () => {
  let finish;
  const first = new Promise(resolve => { finish = resolve; });
  let count = 0;
  const h = harness({ check: () => ++count === 1 ? first : Promise.resolve(denied) });
  const a = h.popup();
  const b = h.popup();
  await settle();
  assert.deepEqual(h.calls, ['extension']);
  assert.equal(h.badge(), '…');
  finish(eligible);
  assert.equal(await a, eligible);
  assert.equal(await b, eligible);
  h.activate();
  await settle();
  assert.equal(h.badge(), 'OK');
  assert.equal(await h.popup(), eligible);
  assert.equal(await h.popup(true), denied);
  await settle();
  assert.equal(h.badge(), 'NO');
  assert.deepEqual(h.calls, ['extension', 'extension']);
});

test('popup reuses the page checker when it is available', async () => {
  const h = harness({ page: denied });
  assert.equal(await h.popup(), denied);
  await settle();
  assert.equal(h.badge(), 'NO');
  assert.deepEqual(h.calls, []);
});

test('fallback uses the tab session in private browsing and Firefox containers', async () => {
  for (const options of [{ tab: { incognito: true } }, { tab: { cookieStoreId: 'firefox-container-1' }, firefox: true }]) {
    const h = harness({ ...options, check: async () => eligible });
    assert.equal(await h.popup(), eligible);
    await settle();
    assert.equal(h.badge(), 'OK');
    assert.deepEqual(h.calls, ['tab']);
  }
});

test('a fallback result cannot replace the badge after navigation away', async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const h = harness({ check: () => pending });
  const request = h.popup();
  await settle();
  h.navigate('https://example.com/');
  finish(eligible);
  assert.equal(await request, undefined);
  assert.equal(await h.popup(), undefined);
  await settle();
  assert.equal(h.badge(), 'OFF');
  assert.deepEqual(h.calls, ['extension']);
});
