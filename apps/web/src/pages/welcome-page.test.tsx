import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { apiClient } from '@/lib/api';
import { AuthProvider, resetAuthBootstrapForTests, useAuth } from '@/providers/auth-provider';
import { WelcomePage } from './welcome-page';

function LogoutControl() {
  const { logout } = useAuth();
  return (
    <button type="button" onClick={() => void logout()}>
      Test logout
    </button>
  );
}

function renderWelcome(extra?: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WelcomePage />
        {extra}
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function roleButton(role: 'Student' | 'Captain' | 'Administrator'): HTMLButtonElement {
  const heading = screen.getByRole('heading', { name: role });
  return within(heading.closest('article')!).getByRole('button');
}

describe('role selection', () => {
  beforeEach(() => resetAuthBootstrapForTests());

  it('enables all role actions after anonymous bootstrap completes', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(mockGet);
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('anonymous'));
    renderWelcome();
    expect(roleButton('Student')).toBeDisabled();
    await waitFor(() => expect(roleButton('Student')).toBeEnabled());
    expect(roleButton('Captain')).toBeEnabled();
    expect(roleButton('Administrator')).toBeEnabled();
  });

  it('disables only the pending role and prevents its duplicate submission', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(mockGet);
    let resolveStart!: (value: unknown) => void;
    const post = vi.spyOn(apiClient, 'post').mockImplementation((url) => {
      if (url === '/auth/refresh') return Promise.reject(new Error('anonymous'));
      return new Promise((resolve) => {
        resolveStart = resolve;
      }) as never;
    });
    renderWelcome();
    await waitFor(() => expect(roleButton('Student')).toBeEnabled());
    fireEvent.click(roleButton('Student'));
    fireEvent.click(roleButton('Student'));
    expect(roleButton('Student')).toBeDisabled();
    expect(roleButton('Student')).toHaveAttribute('aria-busy', 'true');
    expect(roleButton('Captain')).toBeEnabled();
    expect(post.mock.calls.filter(([url]) => url === '/auth/google/start')).toHaveLength(1);
    resolveStart({ data: { data: { authorizationUrl: 'https://accounts.google.test/auth' } } });
  });

  it('re-enables a role after OAuth start failure for retry', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(mockGet);
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('offline'));
    renderWelcome();
    await waitFor(() => expect(roleButton('Captain')).toBeEnabled());
    fireEvent.click(roleButton('Captain'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(roleButton('Captain')).toBeEnabled();
  });

  it('sends each backend role intent without locally granting it', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(mockGet);
    const post = vi.spyOn(apiClient, 'post').mockImplementation(async (url) => {
      if (url === '/auth/refresh') throw new Error('anonymous');
      throw new Error('navigation suppressed');
    });
    renderWelcome();
    await waitFor(() => expect(roleButton('Student')).toBeEnabled());
    ['Student', 'Captain', 'Administrator'].forEach((role) =>
      fireEvent.click(roleButton(role as 'Student' | 'Captain' | 'Administrator')),
    );
    await waitFor(() => {
      const starts = post.mock.calls.filter(([url]) => url === '/auth/google/start');
      expect(starts.map(([, body]) => (body as { role: string }).role)).toEqual([
        'STUDENT',
        'CAPTAIN',
        'ADMIN',
      ]);
    });
    expect(screen.queryByText(/membership is active/i)).not.toBeInTheDocument();
  });

  it('keeps role actions disabled until post-logout anonymous bootstrap completes', async () => {
    let bootstrapCalls = 0;
    let resolveAnonymousBootstrap!: (value: unknown) => void;
    vi.spyOn(apiClient, 'get').mockImplementation((url) => {
      if (url !== '/auth/bootstrap') return Promise.resolve({ data: {} });
      bootstrapCalls += 1;
      if (bootstrapCalls === 1)
        return Promise.resolve({
          data: {
            success: true,
            data: {
              sessionPresent: true,
              csrfToken: 'csrf-authenticated',
              googleClientId: 'public-client-id',
            },
          },
        });
      return new Promise((resolve) => {
        resolveAnonymousBootstrap = resolve;
      }) as never;
    });
    vi.spyOn(apiClient, 'post').mockImplementation(async (url) => {
      if (url === '/auth/refresh')
        return {
          data: {
            success: true,
            data: {
              accessToken: 'access',
              csrfToken: 'csrf-refreshed',
              user: {
                id: 'captain',
                email: 'captain@example.test',
                displayName: 'Captain',
                roles: [],
                requestedRole: 'CAPTAIN',
              },
            },
          },
        };
      return { data: { success: true, data: { loggedOut: true } } };
    });
    renderWelcome(<LogoutControl />);
    await waitFor(() => expect(roleButton('Student')).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Test logout' }));
    await waitFor(() => expect(bootstrapCalls).toBe(2));
    expect(roleButton('Student')).toBeDisabled();
    expect(roleButton('Captain')).toBeDisabled();
    resolveAnonymousBootstrap({
      data: {
        success: true,
        data: {
          sessionPresent: false,
          csrfToken: 'csrf-post-logout',
          googleClientId: 'public-client-id',
        },
      },
    });
    await waitFor(() => expect(roleButton('Student')).toBeEnabled());
    expect(roleButton('Captain')).toBeEnabled();
  });
});

async function mockGet(url: string) {
  if (url === '/auth/bootstrap')
    return {
      data: {
        success: true,
        data: {
          sessionPresent: false,
          csrfToken: 'csrf-test',
          googleClientId: 'public-client-id',
        },
      },
    };
  return { data: {} };
}
