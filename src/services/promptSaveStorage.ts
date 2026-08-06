import type { PromptTimelineItem } from './chatgptPromptTimeline';
import { safeStorageGet, safeStorageSet } from './extensionStorage';

const IMPORTANT_STORAGE_KEY = 'aiChatNavigatorImportantPromptsV1';
const FAVORITES_STORAGE_KEY = 'aiChatNavigatorPromptFavoritesV1';

type ImportantPromptStore = Record<string, string[]>;

export interface ConversationIdentity {
  conversationId: string;
  conversationUrl: string;
}

export interface PromptFavorite {
  favoriteId: string;
  promptId: string;
  conversationId: string;
  conversationUrl: string;
  title: string;
  promptFullText: string;
  tags: string[];
  savedAt: string;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function createFavoriteId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createPromptFavoriteTitle(promptFullText: string) {
  const chars = Array.from(promptFullText.trim());

  if (chars.length <= 44) {
    return promptFullText.trim() || '未命名 Prompt';
  }

  return `${chars.slice(0, 44).join('')}…`;
}

function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
  );
}

function isPromptFavorite(value: unknown): value is PromptFavorite {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const favorite = value as Partial<PromptFavorite>;

  return Boolean(
    typeof favorite.favoriteId === 'string' &&
      typeof favorite.promptId === 'string' &&
      typeof favorite.conversationId === 'string' &&
      typeof favorite.conversationUrl === 'string' &&
      typeof favorite.title === 'string' &&
      typeof favorite.promptFullText === 'string' &&
      Array.isArray(favorite.tags) &&
      favorite.tags.every((tag) => typeof tag === 'string') &&
      typeof favorite.savedAt === 'string',
  );
}

export function getConversationIdentity(): ConversationIdentity {
  const url = new URL(window.location.href);
  const conversationMatch = url.pathname.match(/^\/c\/([^/?#]+)/);
  const stablePath = conversationMatch
    ? `/c/${conversationMatch[1]}`
    : url.pathname.replace(/\/$/, '') || '/';

  return {
    conversationId: conversationMatch?.[1] || `${url.host}${stablePath}`,
    conversationUrl: `${url.origin}${stablePath}`,
  };
}

export function getPromptStorageId(item: PromptTimelineItem) {
  if (item.turnId) {
    return `turn:${item.turnId}`;
  }

  return `prompt:${item.order}:${hashString(item.text)}`;
}

export function getFavoriteSourceKey(
  conversationId: string,
  promptId: string,
) {
  return `${conversationId}::${promptId}`;
}

export async function loadImportantPromptIds(conversationId: string) {
  const store = await safeStorageGet<unknown>(IMPORTANT_STORAGE_KEY, {});

  if (!store || typeof store !== 'object' || Array.isArray(store)) {
    return new Set<string>();
  }

  const promptIds = (store as ImportantPromptStore)[conversationId];

  return new Set(
    Array.isArray(promptIds)
      ? promptIds.filter((promptId) => typeof promptId === 'string')
      : [],
  );
}

export async function setImportantPrompt(
  conversationId: string,
  promptId: string,
  isImportant: boolean,
) {
  const storedValue = await safeStorageGet<unknown>(IMPORTANT_STORAGE_KEY, {});
  const store: ImportantPromptStore =
    storedValue && typeof storedValue === 'object' && !Array.isArray(storedValue)
      ? { ...(storedValue as ImportantPromptStore) }
      : {};
  const promptIds = new Set(
    Array.isArray(store[conversationId]) ? store[conversationId] : [],
  );

  if (isImportant) {
    promptIds.add(promptId);
  } else {
    promptIds.delete(promptId);
  }

  if (promptIds.size > 0) {
    store[conversationId] = Array.from(promptIds);
  } else {
    delete store[conversationId];
  }

  await safeStorageSet({ [IMPORTANT_STORAGE_KEY]: store });

  return promptIds;
}

export async function loadPromptFavorites() {
  const storedValue = await safeStorageGet<unknown>(FAVORITES_STORAGE_KEY, []);

  if (!Array.isArray(storedValue)) {
    return [] as PromptFavorite[];
  }

  return storedValue.filter(isPromptFavorite);
}

export async function addPromptFavorite(
  item: PromptTimelineItem,
  conversation: ConversationIdentity,
  options: {
    title?: string;
    tags?: string[];
  } = {},
) {
  const favorites = await loadPromptFavorites();
  const promptId = getPromptStorageId(item);
  const sourceKey = getFavoriteSourceKey(conversation.conversationId, promptId);
  const existing = favorites.find(
    (favorite) =>
      getFavoriteSourceKey(favorite.conversationId, favorite.promptId) ===
      sourceKey,
  );

  if (existing) {
    return favorites;
  }

  const nextFavorites: PromptFavorite[] = [
    {
      favoriteId: createFavoriteId(),
      promptId,
      conversationId: conversation.conversationId,
      conversationUrl: conversation.conversationUrl,
      title: options.title?.trim() || createPromptFavoriteTitle(item.text),
      promptFullText: item.text,
      tags: normalizeTags(options.tags || []),
      savedAt: new Date().toISOString(),
    },
    ...favorites,
  ];

  await safeStorageSet({ [FAVORITES_STORAGE_KEY]: nextFavorites });

  return nextFavorites;
}

export async function removePromptFavorite(favoriteId: string) {
  const favorites = await loadPromptFavorites();
  const nextFavorites = favorites.filter(
    (favorite) => favorite.favoriteId !== favoriteId,
  );

  await safeStorageSet({ [FAVORITES_STORAGE_KEY]: nextFavorites });

  return nextFavorites;
}

export async function updatePromptFavorite(
  favoriteId: string,
  updates: Pick<PromptFavorite, 'title' | 'tags'>,
) {
  const favorites = await loadPromptFavorites();
  const nextFavorites = favorites.map((favorite) => {
    if (favorite.favoriteId !== favoriteId) {
      return favorite;
    }

    return {
      ...favorite,
      title: updates.title.trim() || createPromptFavoriteTitle(favorite.promptFullText),
      tags: normalizeTags(updates.tags),
    };
  });

  await safeStorageSet({ [FAVORITES_STORAGE_KEY]: nextFavorites });

  return nextFavorites;
}
