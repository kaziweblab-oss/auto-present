import type { AuthUser } from '@auto-present/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, getAccessToken, getCsrfToken, setAccessToken, setCsrfToken } from '@/lib/api';
import { revokeGoogleIdentityConsent } from '@/lib/google-identity-services';
import { AuthProvider, resetAuthBootstrapForTests, useAuth } from './auth-provider';

vi.mock('@/lib/google-identity-services', () => ({
  revokeGoogleIdentityConsent: vi.fn().mockResolvedValue(true),
}));

const user: AuthUser = {
  id: 'user-1',
  email: 'student@example.test',
  displayName: 'Student',
  roles: [],
};

function Probe(): ReactNode {
  const auth = useAuth();
  return (
    <>
      <output>{`${auth.status}:${auth.user?.displayName ?? 'none'}`}</output>
      <button type="button" disabled={auth.isLoggingOut} onClick={() => void auth.logout()}>
        logout
      </button>
      <button
        type="button"
        disabled={auth.isDisconnectingGoogle}
        onClick={() => void auth.disconnectGoogle()}
      >
        disconnect
      </button>
      {auth.logoutErrorCode && <span>{auth.logoutErrorCode}</span>}
      {auth.disconnectGoogleErrorCode && <span>{auth.disconnectGoogleErrorCode}</span>}
    </>
  );
}

describe('AuthProvider bootstrap', () => {
  beforeEach(() => {
    resetAuthBootstrapForTests();
    setAccessToken(null);
    setCsrfToken(null);
    vi.mocked(revokeGoogleIdentityConsent).mockResolvedValue(true);
  });

  it('resolves a fresh browser anonymously without calling refresh', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          sessionPresent: false,
          csrfToken: 'csrf-fresh',
          googleClientId: 'public-client-id',
        },
      },
    });
    const post = vi.spyOn(apiClient, 'post');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByText('loading:none')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('anonymous:none')).toBeInTheDocument());
    expect(post).not.toHaveBeenCalledWith('/auth/refresh');
  });

  it('refreshes once when bootstrap reports an existing session', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          sessionPresent: true,
          csrfToken: 'csrf-session',
          googleClientId: 'public-client-id',
        },
      },
    });
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { data: { accessToken: 'access', user } },
    });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('authenticated:Student')).toBeInTheDocument());
    expect(post.mock.calls.filter(([url]) => url === '/auth/refresh')).toHaveLength(1);
    expect(getAccessToken()).toBe('access');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('single-flights StrictMode bootstrap and refresh rotation', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          sessionPresent: true,
          csrfToken: 'csrf-strict',
          googleClientId: 'public-client-id',
        },
      },
    });
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { data: { accessToken: 'access', user } },
    });
    render(
      <StrictMode>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </StrictMode>,
    );
    await waitFor(() => expect(screen.getByText('authenticated:Student')).toBeInTheDocument());
    expect(get.mock.calls.filter(([url]) => url === '/auth/bootstrap')).toHaveLength(1);
    expect(post.mock.calls.filter(([url]) => url === '/auth/refresh')).toHaveLength(1);
  });

  it('fails closed to anonymous when an existing session is expired', async () => {
    setAccessToken('stale');
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          sessionPresent: true,
          csrfToken: 'csrf-expired',
          googleClientId: 'public-client-id',
        },
      },
    });
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('expired'));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('anonymous:none')).toBeInTheDocument());
    expect(getAccessToken()).toBeNull();
  });

  it('clears in-memory auth and CSRF state only after successful logout', async () => {
    let bootstrapCalls = 0;
    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url === '/auth/google/connection')
        return {
          data: { success: true, data: { status: 'NOT_CONNECTED', scopes: [] } },
        };
      bootstrapCalls += 1;
      return {
        data: {
          success: true,
          data: {
            sessionPresent: bootstrapCalls === 1,
            csrfToken: bootstrapCalls === 1 ? 'csrf-logout' : 'csrf-anonymous',
            googleClientId: 'public-client-id',
          },
        },
      };
    });
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { data: { accessToken: 'access', user } },
    });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('authenticated:Student')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'logout' }));
    await waitFor(() => expect(screen.getByText('anonymous:none')).toBeInTheDocument());
    expect(post.mock.calls.filter(([url]) => url === '/auth/logout')).toHaveLength(1);
    expect(bootstrapCalls).toBe(2);
    expect(getAccessToken()).toBeNull();
    expect(getCsrfToken()).toBeNull();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('preserves authenticated memory state and allows retry when logout fails', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          sessionPresent: true,
          csrfToken: 'csrf-retry',
          googleClientId: 'public-client-id',
        },
      },
    });
    vi.spyOn(apiClient, 'post').mockImplementation(async (url) => {
      if (url === '/auth/refresh') return { data: { data: { accessToken: 'access', user } } };
      throw new Error('network');
    });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('authenticated:Student')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'logout' }));
    expect(await screen.findByText('LOGOUT_FAILED')).toBeInTheDocument();
    expect(screen.getByText('authenticated:Student')).toBeInTheDocument();
    expect(getAccessToken()).toBe('access');
    expect(screen.getByRole('button', { name: 'logout' })).toBeEnabled();
  });

  it('clears memory and re-bootstraps anonymously after Google disconnect', async () => {
    let bootstrapCalls = 0;
    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url === '/auth/google/connection')
        return { data: { success: true, data: { status: 'CONNECTED', scopes: [] } } };
      bootstrapCalls += 1;
      return {
        data: {
          success: true,
          data: {
            sessionPresent: bootstrapCalls === 1,
            csrfToken: bootstrapCalls === 1 ? 'csrf-session' : 'csrf-anonymous',
            googleClientId: 'public-client-id',
          },
        },
      };
    });
    const post = vi.spyOn(apiClient, 'post').mockImplementation(async (url) => {
      if (url === '/auth/refresh') return { data: { data: { accessToken: 'access', user } } };
      return { data: { success: true, data: { status: 'DISCONNECTED' } } };
    });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('authenticated:Student')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'disconnect' }));
    await waitFor(() => expect(screen.getByText('anonymous:none')).toBeInTheDocument());
    expect(post.mock.calls.filter(([url]) => url === '/auth/google/disconnect')).toHaveLength(1);
    expect(getAccessToken()).toBeNull();
    expect(getCsrfToken()).toBeNull();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('preserves authenticated memory when Google disconnect is retryable', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => ({
      data:
        url === '/auth/google/connection'
          ? { success: true, data: { status: 'CONNECTED', scopes: [] } }
          : {
              success: true,
              data: {
                sessionPresent: true,
                csrfToken: 'csrf-session',
                googleClientId: 'public-client-id',
              },
            },
    }));
    vi.spyOn(apiClient, 'post').mockImplementation(async (url) => {
      if (url === '/auth/refresh') return { data: { data: { accessToken: 'access', user } } };
      throw new Error('retryable');
    });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('authenticated:Student')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'disconnect' }));
    expect(await screen.findByText('GOOGLE_DISCONNECT_PARTIAL')).toBeInTheDocument();
    expect(screen.getByText('authenticated:Student')).toBeInTheDocument();
    expect(getAccessToken()).toBe('access');
    expect(screen.getByRole('button', { name: 'disconnect' })).toBeEnabled();
  });
});
