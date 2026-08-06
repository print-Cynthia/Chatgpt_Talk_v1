import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],

  manifest: {
    name: 'AI Chat Navigator',
    description:
      'Clean ChatGPT Prompt Timeline with hover preview, click-to-jump, and active dot navigation. Local-only, no cloud sync.',
    permissions: ['storage'],
    host_permissions: ['https://chatgpt.com/*'],
  }
});
