import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  manifest: ({ browser }) => ({
    name: 'ChatGPT Offer Toolkit',
    description: 'Generate ChatGPT Business promotional checkout links, visit the official offer page, and manage updates. Built by ePlus.DEV.',
    short_name: 'Offer Toolkit',
    icons: {16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 96: 'icon/96.png', 128: 'icon/128.png'},
    action: {default_title: 'ChatGPT Offer Toolkit', default_icon: {16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png'}},
    permissions: ['activeTab', 'scripting', 'storage', 'alarms'],
    host_permissions: ['https://api.github.com/*', 'https://chatgpt.com/*'],
    ...(browser === 'firefox' ? {
      browser_specific_settings: {
        gecko: { id: 'chatgpt-offer-toolkit@eplus.dev', strict_min_version: '128.0', update_url: 'https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/download/firefox-updates/updates.json' },
      },
    } : { minimum_chrome_version: '102' }),
  }),
  vite: () => ({
    plugins: [tailwindcss()],
    build: { target: 'es2022' },
  }),
});
