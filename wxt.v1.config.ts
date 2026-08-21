import { defineConfig } from 'wxt';

const stagingRoot = process.env.AI_CHAT_NAVIGATOR_STAGING_ROOT;

if (!stagingRoot) {
  throw new Error('AI_CHAT_NAVIGATOR_STAGING_ROOT is required');
}

export default defineConfig({
  outDir: stagingRoot,
  outDirTemplate: 'chrome-mv3_v1',
  modules: ['@wxt-dev/module-react'],

  manifest: {
    name: 'Navvi — AI Multi‑Agent Chat Navigator',
    description:
      'Navigate, search, and organize ChatGPT chats. A local-only sidebar with timeline, favorites, markers, and AI highlights.',
    permissions: ['storage'],
    host_permissions: ['https://chatgpt.com/*'],
  },
});
