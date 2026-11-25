import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: ({ browser }) => ({
    name: 'ChatGPT Offer Toolkit',
    description: 'An independent ePlus.DEV helper for reviewing ChatGPT Business promotions.',
    permissions: ['activeTab', 'scripting', 'storage', 'alarms'],
    host_permissions: ['https://api.github.com/*'],
    ...(browser === 'firefox' ? {
      browser_specific_settings: {
        gecko: { id: 'chatgpt-offer-toolkit@eplus.dev', strict_min_version: '128.0', update_url: 'https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/download/firefox-updates/updates.json' },
      },
    } : { minimum_chrome_version: '102' }),
  }),
  vite: () => ({
    build: { target: 'es2022' },
  }),
});
