import { browser } from 'wxt/browser';

type StorageMessage =
  | { type: 'AI_CHAT_NAVIGATOR_STORAGE_GET'; key: string }
  | {
      type: 'AI_CHAT_NAVIGATOR_STORAGE_SET';
      values: Record<string, unknown>;
    };

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    async (message: StorageMessage) => {
      if (message?.type === 'AI_CHAT_NAVIGATOR_STORAGE_GET') {
        try {
          const values = await browser.storage.local.get(message.key);
          return { ok: true, values };
        } catch (error) {
          return { ok: false, error: String(error) };
        }
      }

      if (message?.type === 'AI_CHAT_NAVIGATOR_STORAGE_SET') {
        try {
          await browser.storage.local.set(message.values);
          return { ok: true };
        } catch (error) {
          return { ok: false, error: String(error) };
        }
      }

      return undefined;
    },
  );
});
