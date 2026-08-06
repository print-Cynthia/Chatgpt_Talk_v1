// Per-conversation storage for AI Response Highlights (v0.7).
//
// Highlights are scoped to the current conversation only (mirrors how
// Important markers are stored), NOT a global library like Favorites.
// Only `chrome.storage.local` is used, and only for user-initiated highlights.

import { safeStorageGet, safeStorageSet } from './extensionStorage';

const HIGHLIGHTS_STORAGE_KEY = 'aiChatNavigatorResponseHighlightsV1';

export type HighlightColor = 'yellow' | 'pink' | 'green' | 'blue' | 'purple';

export type HighlightStyle =
  | 'background'
  | 'marker'
  | 'underline'
  | 'textColor';

export interface ResponseHighlight {
  id: string;
  conversationId: string;
  messageId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  contextBefore: string;
  contextAfter: string;
  color: HighlightColor;
  style: HighlightStyle;
  note: string;
  tags: string[];
  createdAt: number;
}

type HighlightStore = Record<string, ResponseHighlight[]>;

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  'yellow',
  'pink',
  'green',
  'blue',
  'purple',
];

export const HIGHLIGHT_STYLES: HighlightStyle[] = [
  'background',
  'marker',
  'underline',
  'textColor',
];

function normalizeStyle(style: unknown): HighlightStyle {
  return HIGHLIGHT_STYLES.includes(style as HighlightStyle)
    ? (style as HighlightStyle)
    : 'background';
}

function createHighlightId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

function isResponseHighlight(value: unknown): value is ResponseHighlight {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const highlight = value as Partial<ResponseHighlight>;

  return Boolean(
    typeof highlight.id === 'string' &&
      typeof highlight.conversationId === 'string' &&
      typeof highlight.messageId === 'string' &&
      typeof highlight.startOffset === 'number' &&
      typeof highlight.endOffset === 'number' &&
      typeof highlight.text === 'string' &&
      typeof highlight.color === 'string' &&
      Array.isArray(highlight.tags) &&
      highlight.tags.every((tag) => typeof tag === 'string'),
  );
}

function normalizeHighlight(highlight: ResponseHighlight): ResponseHighlight {
  return {
    ...highlight,
    style: normalizeStyle(highlight.style),
  };
}

async function loadStore(): Promise<HighlightStore> {
  const storedValue = await safeStorageGet<unknown>(HIGHLIGHTS_STORAGE_KEY, {});

  if (storedValue && typeof storedValue === 'object' && !Array.isArray(storedValue)) {
    return storedValue as HighlightStore;
  }

  return {};
}

async function persistStore(store: HighlightStore) {
  await safeStorageSet({ [HIGHLIGHTS_STORAGE_KEY]: store });
}

export async function loadHighlights(conversationId: string) {
  const store = await loadStore();
  const list = store[conversationId];

  return Array.isArray(list)
    ? list.filter(isResponseHighlight).map(normalizeHighlight)
    : [];
}

async function saveHighlights(
  conversationId: string,
  highlights: ResponseHighlight[],
) {
  const store = await loadStore();
  store[conversationId] = highlights;
  await persistStore(store);
}

export async function addHighlight(highlight: ResponseHighlight) {
  const store = await loadStore();
  const list = Array.isArray(store[highlight.conversationId])
    ? store[highlight.conversationId].filter(isResponseHighlight)
    : [];
  const nextList = [highlight, ...list];
  store[highlight.conversationId] = nextList;
  await persistStore(store);

  return nextList;
}

export async function removeHighlight(conversationId: string, id: string) {
  const store = await loadStore();
  const list = Array.isArray(store[conversationId])
    ? store[conversationId].filter(isResponseHighlight)
    : [];
  const nextList = list.filter((highlight) => highlight.id !== id);

  if (nextList.length > 0) {
    store[conversationId] = nextList;
  } else {
    delete store[conversationId];
  }

  await persistStore(store);

  return nextList;
}

export async function updateHighlight(
  conversationId: string,
  id: string,
  patch: Partial<
    Pick<ResponseHighlight, 'color' | 'style' | 'note' | 'tags'>
  >,
) {
  const store = await loadStore();
  const list = Array.isArray(store[conversationId])
    ? store[conversationId].filter(isResponseHighlight)
    : [];
  const nextList = list.map((highlight) => {
    if (highlight.id !== id) {
      return highlight;
    }

    return {
      ...highlight,
      ...(patch.color ? { color: patch.color } : null),
      ...(patch.style ? { style: patch.style } : null),
      ...(patch.note !== undefined ? { note: patch.note } : null),
      ...(patch.tags ? { tags: normalizeTags(patch.tags) } : null),
    };
  });

  store[conversationId] = nextList;
  await persistStore(store);

  return nextList;
}

export { createHighlightId };
