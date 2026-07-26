export const STORAGE_VERSION = 'v1';
export const STORAGE_NAMESPACE = 'auto-present';
const VERSION_KEY = `${STORAGE_NAMESPACE}:storage-version`;

export function getStorageKey(key: string): string {
  return `${STORAGE_NAMESPACE}:${STORAGE_VERSION}:${key}`;
}

function getLegacyKey(key: string): string {
  return `${STORAGE_NAMESPACE}-${key}`;
}

export function getItem<T>(key: string, fallback: T): string | T {
  const versioned = localStorage.getItem(getStorageKey(key));
  if (versioned !== null) return versioned;

  const legacy = localStorage.getItem(getLegacyKey(key));
  if (legacy !== null) {
    localStorage.setItem(getStorageKey(key), legacy);
    localStorage.removeItem(getLegacyKey(key));
    return legacy;
  }

  return fallback;
}

export function setItem(key: string, value: string): void {
  localStorage.setItem(getStorageKey(key), value);
}

export function removeItem(key: string): void {
  localStorage.removeItem(getStorageKey(key));
  localStorage.removeItem(getLegacyKey(key));
}

export function clearAll(): void {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (
      key &&
      (key.startsWith(`${STORAGE_NAMESPACE}:`) || key.startsWith(`${STORAGE_NAMESPACE}-`))
    ) {
      localStorage.removeItem(key);
    }
  }
}

export function checkVersionAndMigrate(): void {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  if (storedVersion === STORAGE_VERSION) return;
  clearAll();
  localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
}
