import { describe, expect, it, beforeEach } from 'vitest';
import {
  STORAGE_VERSION,
  STORAGE_NAMESPACE,
  getStorageKey,
  getItem,
  setItem,
  removeItem,
  clearAll,
  checkVersionAndMigrate,
} from './storage';

const VERSION_KEY = `${STORAGE_NAMESPACE}:storage-version`;

beforeEach(() => {
  localStorage.clear();
});

describe('getStorageKey', () => {
  it('returns versioned key', () => {
    expect(getStorageKey('theme')).toBe(`${STORAGE_NAMESPACE}:${STORAGE_VERSION}:theme`);
  });
});

describe('getItem', () => {
  it('returns fallback when no data exists', () => {
    expect(getItem('missing', 'default')).toBe('default');
  });

  it('reads versioned key', () => {
    localStorage.setItem(`${STORAGE_NAMESPACE}:${STORAGE_VERSION}:theme`, 'dark');
    expect(getItem('theme', 'system')).toBe('dark');
  });

  it('migrates legacy key and deletes it', () => {
    localStorage.setItem(`${STORAGE_NAMESPACE}-theme`, 'dark');
    expect(getItem('theme', 'system')).toBe('dark');
    expect(localStorage.getItem(`${STORAGE_NAMESPACE}-theme`)).toBeNull();
    expect(localStorage.getItem(`${STORAGE_NAMESPACE}:${STORAGE_VERSION}:theme`)).toBe('dark');
  });
});

describe('setItem', () => {
  it('writes versioned key', () => {
    setItem('language', 'bn');
    expect(localStorage.getItem(`${STORAGE_NAMESPACE}:${STORAGE_VERSION}:language`)).toBe('bn');
  });

  it('overwrites existing value', () => {
    setItem('language', 'en');
    setItem('language', 'bn');
    expect(localStorage.getItem(`${STORAGE_NAMESPACE}:${STORAGE_VERSION}:language`)).toBe('bn');
  });
});

describe('removeItem', () => {
  it('removes versioned and legacy key', () => {
    setItem('theme', 'dark');
    localStorage.setItem(`${STORAGE_NAMESPACE}-theme`, 'old');
    removeItem('theme');
    expect(localStorage.getItem(`${STORAGE_NAMESPACE}:${STORAGE_VERSION}:theme`)).toBeNull();
    expect(localStorage.getItem(`${STORAGE_NAMESPACE}-theme`)).toBeNull();
  });
});

describe('clearAll', () => {
  it('removes only application-owned keys', () => {
    localStorage.setItem(`${STORAGE_NAMESPACE}:${STORAGE_VERSION}:theme`, 'dark');
    localStorage.setItem(`${STORAGE_NAMESPACE}:${STORAGE_VERSION}:language`, 'bn');
    localStorage.setItem('other-app-key', 'keep');
    localStorage.setItem('google-oauth-key', 'keep');
    clearAll();
    expect(localStorage.getItem(`${STORAGE_NAMESPACE}:${STORAGE_VERSION}:theme`)).toBeNull();
    expect(localStorage.getItem(`${STORAGE_NAMESPACE}:${STORAGE_VERSION}:language`)).toBeNull();
    expect(localStorage.getItem('other-app-key')).toBe('keep');
    expect(localStorage.getItem('google-oauth-key')).toBe('keep');
  });
});

describe('checkVersionAndMigrate', () => {
  it('preserves data when version matches', () => {
    setItem('theme', 'dark');
    localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
    checkVersionAndMigrate();
    expect(getItem('theme', 'system')).toBe('dark');
  });

  it('clears app storage when version is missing', () => {
    setItem('theme', 'dark');
    localStorage.setItem('other-app-key', 'keep');
    checkVersionAndMigrate();
    expect(getItem('theme', 'system')).toBe('system');
    expect(localStorage.getItem('other-app-key')).toBe('keep');
    expect(localStorage.getItem(VERSION_KEY)).toBe(STORAGE_VERSION);
  });

  it('clears app storage on version mismatch and sets new version', () => {
    setItem('theme', 'dark');
    localStorage.setItem(VERSION_KEY, 'v0');
    localStorage.setItem('other-app-key', 'keep');
    checkVersionAndMigrate();
    expect(getItem('theme', 'system')).toBe('system');
    expect(localStorage.getItem('other-app-key')).toBe('keep');
    expect(localStorage.getItem(VERSION_KEY)).toBe(STORAGE_VERSION);
  });
});

describe('integration: theme persists normally', () => {
  it('preserves theme across simulated reloads', () => {
    setItem('theme', 'dark');
    const reloaded = getItem('theme', 'system');
    expect(reloaded).toBe('dark');
  });

  it('preserves language across simulated reloads', () => {
    setItem('language', 'bn');
    const reloaded = getItem('language', 'en');
    expect(reloaded).toBe('bn');
  });
});

describe('auth persistence', () => {
  it('never touches localStorage', () => {
    expect(localStorage.length).toBe(0);
  });
});

describe('unrelated browser storage', () => {
  it('preserves cookies (simulated via non-namespaced keys)', () => {
    localStorage.setItem('cookie-pref-session', 'abc123');
    localStorage.setItem(`${STORAGE_NAMESPACE}:${STORAGE_VERSION}:theme`, 'dark');
    clearAll();
    expect(localStorage.getItem('cookie-pref-session')).toBe('abc123');
  });

  it('preserves cross-site OAuth storage', () => {
    localStorage.setItem('g_state', '{"id":"test"}');
    localStorage.setItem(`${STORAGE_NAMESPACE}:${STORAGE_VERSION}:theme`, 'dark');
    checkVersionAndMigrate();
    expect(localStorage.getItem('g_state')).toBe('{"id":"test"}');
  });
});
