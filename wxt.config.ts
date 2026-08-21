import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],

  manifest: {
    name: 'Navvi — AI Multi‑Agent Chat Navigator',
    description:
      'Navigate, search, and organize ChatGPT chats. A local-only sidebar with timeline, favorites, markers, and AI highlights.',
    permissions: ['storage'],
    host_permissions: ['https://chatgpt.com/*'],
  }
});
