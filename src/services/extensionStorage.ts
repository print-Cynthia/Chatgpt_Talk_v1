type StorageValue = Record<string, unknown>;

type StorageAreaLike = {
  get: (keys?: string | string[] | StorageValue | null) => Promise<StorageValue>;
  set: (items: StorageValue) => Promise<void>;
};

type RuntimeLike = {
  id?: string;
  sendMessage?: (message: StorageMessage) => Promise<StorageResponse>;
};

type ExtensionApiLike = {
  runtime?: RuntimeLike;
  storage?: {
    local?: StorageAreaLike;
  };
};

type StorageMessage =
  | { type: 'AI_CHAT_NAVIGATOR_STORAGE_GET'; key: string }
  | { type: 'AI_CHAT_NAVIGATOR_STORAGE_SET'; values: StorageValue };

type StorageResponse = {
  ok: boolean;
  values?: StorageValue;
  error?: string;
};

const memoryStore = new Map<string, unknown>();
let hasWarnedStorageUnavailable = false;

function getExtensionApis(): ExtensionApiLike[] {
  return [
    (globalThis as { browser?: ExtensionApiLike }).browser,
    (globalThis as { chrome?: ExtensionApiLike }).chrome,
  ].filter((candidate): candidate is ExtensionApiLike => Boolean(candidate));
}

function getStorageArea(): StorageAreaLike | null {
  for (const candidate of getExtensionApis()) {
    const area = candidate.storage?.local;

    if (area && typeof area.get === 'function' && typeof area.set === 'function') {
      return area;
    }
  }

  return null;
}

function getRuntime(): RuntimeLike | null {
  for (const candidate of getExtensionApis()) {
    const runtime = candidate.runtime;

    if (runtime?.id && typeof runtime.sendMessage === 'function') {
      return runtime;
    }
  }

  return null;
}

function warnStorageUnavailable() {
  if (hasWarnedStorageUnavailable) {
    return;
  }

  hasWarnedStorageUnavailable = true;
  console.warn(
    '[AI Chat Navigator] persistent extension storage is unavailable; using in-memory fallback',
  );
}

function rememberValues(values: StorageValue) {
  for (const [key, value] of Object.entries(values)) {
    memoryStore.set(key, value);
  }
}

async function readThroughRuntime(key: string): Promise<StorageValue | null> {
  const runtime = getRuntime();

  if (!runtime?.sendMessage) {
    return null;
  }

  try {
    const response = await runtime.sendMessage({
      type: 'AI_CHAT_NAVIGATOR_STORAGE_GET',
      key,
    });

    return response?.ok && response.values ? response.values : null;
  } catch {
    return null;
  }
}

async function writeThroughRuntime(values: StorageValue): Promise<boolean> {
  const runtime = getRuntime();

  if (!runtime?.sendMessage) {
    return false;
  }

  try {
    const response = await runtime.sendMessage({
      type: 'AI_CHAT_NAVIGATOR_STORAGE_SET',
      values,
    });

    return response?.ok === true;
  } catch {
    return false;
  }
}

export async function safeStorageGet<T>(key: string, fallback: T): Promise<T> {
  const area = getStorageArea();

  if (area) {
    try {
      const result = await area.get(key);

      if (Object.prototype.hasOwnProperty.call(result, key)) {
        const value = result[key] as T;
        memoryStore.set(key, value);
        return value;
      }
    } catch (error) {
      console.warn('[AI Chat Navigator] direct storage read failed', error);
    }
  }

  const runtimeValues = await readThroughRuntime(key);

  if (runtimeValues && Object.prototype.hasOwnProperty.call(runtimeValues, key)) {
    const value = runtimeValues[key] as T;
    memoryStore.set(key, value);
    return value;
  }

  if (!area && !getRuntime()) {
    warnStorageUnavailable();
  }

  return memoryStore.has(key) ? (memoryStore.get(key) as T) : fallback;
}

export async function safeStorageSet(values: StorageValue): Promise<boolean> {
  rememberValues(values);

  const area = getStorageArea();

  if (area) {
    try {
      await area.set(values);
      return true;
    } catch (error) {
      console.warn('[AI Chat Navigator] direct storage write failed', error);
    }
  }

  if (await writeThroughRuntime(values)) {
    return true;
  }

  warnStorageUnavailable();
  return false;
}
