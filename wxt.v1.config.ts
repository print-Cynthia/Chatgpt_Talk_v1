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
    name: 'AI Chat Navigator',
    description:
      'Clean ChatGPT Prompt Timeline with hover preview, click-to-jump, and active dot navigation. Local-only, no cloud sync.',
    permissions: ['storage'],
    host_permissions: ['https://chatgpt.com/*'],
  },
});
