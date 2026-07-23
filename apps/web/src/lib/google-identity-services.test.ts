import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GOOGLE_IDENTITY_SERVICES_ORIGIN,
  resetGoogleIdentityServicesForTests,
  revokeGoogleIdentityConsent,
} from './google-identity-services';

const clientId = 'public-client-id.apps.googleusercontent.com';

function installGoogleApi(options?: { initializeError?: boolean; settleRevoke?: boolean }) {
  let initialized = false;
  let initializeAttempts = 0;
  const initialize = vi.fn(() => {
    initializeAttempts += 1;
    if (options?.initializeError && initializeAttempts === 1) throw new Error('initialize failed');
    initialized = true;
  });
  const revoke = vi.fn((_target: string, callback: (response: { successful: boolean }) => void) => {
    if (!initialized) throw new Error('revoke called before initialize');
    if (options?.settleRevoke !== false) callback({ successful: true });
  });
  const prompt = vi.fn();
  window.google = { accounts: { id: { initialize, revoke, prompt } } };
  return { initialize, revoke, prompt };
}

describe('official Google Identity Services revocation boundary', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete window.google;
    document.querySelector(`script[src="${GOOGLE_IDENTITY_SERVICES_ORIGIN}/gsi/client"]`)?.remove();
    resetGoogleIdentityServicesForTests();
  });

  it('loads the official script, initializes with public config, then revokes verified identity', async () => {
    const events: string[] = [];
    const result = revokeGoogleIdentityConsent('verified@example.test', clientId);
    const script = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SERVICES_ORIGIN}/gsi/client"]`,
    );
    expect(script?.src).toBe(`${GOOGLE_IDENTITY_SERVICES_ORIGIN}/gsi/client`);
    const initialize = vi.fn(() => events.push('initialize'));
    const revoke = vi.fn(
      (_target: string, callback: (response: { successful: boolean }) => void) => {
        events.push('revoke');
        callback({ successful: true });
      },
    );
    const prompt = vi.fn();
    window.google = { accounts: { id: { initialize, revoke, prompt } } };
    script?.dispatchEvent(new Event('load'));

    await expect(result).resolves.toBe(true);
    expect(events).toEqual(['initialize', 'revoke']);
    expect(initialize).toHaveBeenCalledWith({
      client_id: clientId,
      callback: expect.any(Function),
      auto_select: false,
    });
    expect(revoke).toHaveBeenCalledWith('verified@example.test', expect.any(Function));
    expect(prompt).not.toHaveBeenCalled();
  });

  it('initializes once and single-flights concurrent revoke calls', async () => {
    const { initialize, revoke } = installGoogleApi();
    const first = revokeGoogleIdentityConsent('verified@example.test', clientId);
    const second = revokeGoogleIdentityConsent('ignored-concurrent@example.test', clientId);
    expect(first).toBe(second);
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('verified@example.test', expect.any(Function));

    await expect(revokeGoogleIdentityConsent('verified@example.test', clientId)).resolves.toBe(
      true,
    );
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it('fails safely without a public client ID and never initializes or revokes', async () => {
    const { initialize, revoke } = installGoogleApi();
    await expect(revokeGoogleIdentityConsent('verified@example.test', null)).resolves.toBe(false);
    expect(initialize).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
  });

  it('allows retry after an initialization exception', async () => {
    const api = installGoogleApi({ initializeError: true });
    await expect(revokeGoogleIdentityConsent('verified@example.test', clientId)).resolves.toBe(
      false,
    );
    expect(api.revoke).not.toHaveBeenCalled();
    await expect(revokeGoogleIdentityConsent('verified@example.test', clientId)).resolves.toBe(
      true,
    );
    expect(api.initialize).toHaveBeenCalledTimes(2);
    expect(api.revoke).toHaveBeenCalledTimes(1);
  });

  it('returns safely on script failure and can retry loading', async () => {
    const first = revokeGoogleIdentityConsent('verified@example.test', clientId);
    const firstScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SERVICES_ORIGIN}/gsi/client"]`,
    );
    firstScript?.dispatchEvent(new Event('error'));
    await expect(first).resolves.toBe(false);

    const second = revokeGoogleIdentityConsent('verified@example.test', clientId);
    const secondScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SERVICES_ORIGIN}/gsi/client"]`,
    );
    expect(secondScript).not.toBe(firstScript);
    installGoogleApi();
    secondScript?.dispatchEvent(new Event('load'));
    await expect(second).resolves.toBe(true);
  });

  it('bounds an absent revoke callback and releases the operation for retry', async () => {
    vi.useFakeTimers();
    const api = installGoogleApi({ settleRevoke: false });
    const first = revokeGoogleIdentityConsent('verified@example.test', clientId);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(first).resolves.toBe(false);

    api.revoke.mockImplementation((_target, callback) => callback({ successful: true }));
    await expect(revokeGoogleIdentityConsent('verified@example.test', clientId)).resolves.toBe(
      true,
    );
    expect(api.initialize).toHaveBeenCalledTimes(1);
    expect(api.revoke).toHaveBeenCalledTimes(2);
  });
});
