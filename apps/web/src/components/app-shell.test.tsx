import type { AuthUser } from '@auto-present/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { apiClient } from '@/lib/api';
import { revokeGoogleIdentityConsent } from '@/lib/google-identity-services';
import { AuthProvider, resetAuthBootstrapForTests } from '@/providers/auth-provider';
import { AppShell } from './app-shell';

vi.mock('@/components/theme-selector', () => ({
  ThemeSelector: () => <button type="button">Theme test control</button>,
}));
vi.mock('@/lib/google-identity-services', () => ({
  revokeGoogleIdentityConsent: vi.fn().mockResolvedValue(true),
}));

const captain: AuthUser = {
  id: 'captain-1',
  email: 'captain@example.test',
  displayName: 'Captain Example',
  roles: [],
  requestedRole: 'CAPTAIN',
};

function renderShell(initialEntry = '/'): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<p>Welcome destination</p>} />
              <Route path="privacy" element={<p>Privacy destination</p>} />
              <Route path="auth/result" element={<p>Verification destination</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function mockBootstrap(
  user: AuthUser | null,
  connectionStatus: 'CONNECTED' | 'NOT_CONNECTED' = 'CONNECTED',
) {
  let bootstrapCalls = 0;
  vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
    if (url === '/auth/google/connection')
      return { data: { success: true, data: { status: connectionStatus, scopes: [] } } };
    bootstrapCalls += 1;
    return {
      data: {
        success: true,
        data: {
          sessionPresent: Boolean(user) && bootstrapCalls === 1,
          csrfToken: bootstrapCalls === 1 ? 'csrf-menu' : 'csrf-post-logout',
          googleClientId: 'public-client-id',
        },
      },
    };
  });
  return vi.spyOn(apiClient, 'post').mockImplementation(async (url) => {
    if (url === '/auth/refresh') return { data: { data: { accessToken: 'access-menu', user } } };
    return { data: { success: true } };
  });
}

describe('auth-aware header menu', () => {
  beforeEach(async () => {
    resetAuthBootstrapForTests();
    vi.mocked(revokeGoogleIdentityConsent).mockResolvedValue(true);
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows only public actions to guests and removes the placeholder profile item', async () => {
    mockBootstrap(null);
    renderShell();
    const trigger = screen.getByRole('button', { name: 'Account and help' });
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    fireEvent.click(trigger);
    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Get Login Help' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Help Center' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Terms of Service' })).toBeInTheDocument();
    expect(within(menu).queryByText(/profile coming soon/i)).not.toBeInTheDocument();
  });

  it('shows authenticated identity, role, Captain status, and a real existing status route', async () => {
    mockBootstrap(captain);
    renderShell();
    const trigger = await screen.findByRole('button', { name: 'Account and help' });
    await waitFor(() => expect(trigger).toHaveTextContent('CE'));
    fireEvent.click(trigger);
    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('Captain Example')).toBeInTheDocument();
    expect(within(menu).getByText('captain@example.test')).toBeInTheDocument();
    expect(within(menu).getByText('Captain')).toBeInTheDocument();
    expect(within(menu).getByText('Captain: Sheet verification pending')).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: 'View verification status' }),
    ).toHaveAttribute('href', '/auth/result');
    expect(within(menu).getByRole('menuitem', { name: 'Disconnect Google' })).toBeEnabled();
  });

  it('keeps identity-only Disconnect enabled while presenting connection state', async () => {
    mockBootstrap(captain, 'NOT_CONNECTED');
    renderShell();
    const trigger = await screen.findByRole('button', { name: 'Account and help' });
    await waitFor(() => expect(trigger).toHaveTextContent('CE'));
    fireEvent.click(trigger);
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Disconnect Google' })).toBeEnabled(),
    );
    expect(screen.getByText('Identity connected')).toBeInTheDocument();
    expect(screen.getByText('Workspace not connected')).toBeInTheDocument();
  });

  it('shows an accessible confirmation and Cancel makes no request', async () => {
    const post = mockBootstrap(captain);
    renderShell();
    const trigger = await screen.findByRole('button', { name: 'Account and help' });
    await waitFor(() => expect(trigger).toHaveTextContent('CE'));
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Disconnect Google' }));
    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(post.mock.calls.filter(([url]) => url === '/auth/google/disconnect')).toHaveLength(0);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Disconnect Google' }));
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('disconnects once and returns to Welcome', async () => {
    const post = mockBootstrap(captain);
    renderShell('/privacy');
    const trigger = await screen.findByRole('button', { name: 'Account and help' });
    await waitFor(() => expect(trigger).toHaveTextContent('CE'));
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Disconnect Google' }));
    const confirm = screen.getByRole('button', { name: 'Disconnect Google' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await screen.findByText('Welcome destination');
    expect(post.mock.calls.filter(([url]) => url === '/auth/google/disconnect')).toHaveLength(1);
    expect(revokeGoogleIdentityConsent).toHaveBeenCalledWith(
      'captain@example.test',
      'public-client-id',
    );
  });

  it('reports partial completion and retries backend cleanup without repeating GIS revoke', async () => {
    const post = mockBootstrap(captain);
    post.mockImplementation(async (url) => {
      if (url === '/auth/refresh')
        return { data: { data: { accessToken: 'access-menu', user: captain } } };
      if (url === '/auth/google/disconnect') throw new Error('retryable');
      return { data: { success: true } };
    });
    renderShell();
    const trigger = await screen.findByRole('button', { name: 'Account and help' });
    await waitFor(() => expect(trigger).toHaveTextContent('CE'));
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Disconnect Google' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Google identity consent was removed, but Auto Present cleanup is incomplete.',
    );
    expect(screen.getByRole('button', { name: 'Disconnect Google' })).toBeEnabled();
    expect(screen.getByText('captain@example.test')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Google' }));
    await waitFor(() =>
      expect(post.mock.calls.filter(([url]) => url === '/auth/google/disconnect')).toHaveLength(2),
    );
    expect(revokeGoogleIdentityConsent).toHaveBeenCalledTimes(1);
  });

  it('does not run backend cleanup when GIS is unavailable and shows official fallback', async () => {
    vi.mocked(revokeGoogleIdentityConsent).mockResolvedValue(false);
    const post = mockBootstrap(captain, 'NOT_CONNECTED');
    renderShell();
    const trigger = await screen.findByRole('button', { name: 'Account and help' });
    await waitFor(() => expect(trigger).toHaveTextContent('CE'));
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Disconnect Google' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Google identity consent could not be removed here.',
    );
    expect(screen.getByRole('link', { name: 'Open Google Account permissions' })).toHaveAttribute(
      'href',
      'https://myaccount.google.com/permissions',
    );
    expect(post.mock.calls.filter(([url]) => url === '/auth/google/disconnect')).toHaveLength(0);
  });

  it('presents the destructive confirmation in Bangla', async () => {
    mockBootstrap(captain);
    renderShell();
    const trigger = await screen.findByRole('button', { name: 'Account and help' });
    await waitFor(() => expect(trigger).toHaveTextContent('CE'));
    fireEvent.click(screen.getByRole('button', { name: 'বাংলা' }));
    fireEvent.click(screen.getByRole('button', { name: 'অ্যাকাউন্ট ও সহায়তা' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Google সংযোগ বিচ্ছিন্ন করুন' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Auto Present-এর Google পরিচয় সংযোগ ও সম্মতি সরানো হবে।',
    );
    expect(screen.getByRole('button', { name: 'বাতিল' })).toHaveFocus();
  });

  it('closes on Escape and outside pointer interaction and restores trigger focus', async () => {
    mockBootstrap(null);
    renderShell();
    const trigger = screen.getByRole('button', { name: 'Account and help' });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('logs out once, clears the authenticated menu, and navigates to Welcome safely', async () => {
    const post = mockBootstrap(captain);
    renderShell('/privacy');
    const trigger = await screen.findByRole('button', { name: 'Account and help' });
    await waitFor(() => expect(trigger).toHaveTextContent('CE'));
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Logout' }));
    await screen.findByText('Welcome destination');
    expect(post.mock.calls.filter(([url]) => url === '/auth/logout')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Account and help' }));
    expect(screen.getByRole('menuitem', { name: 'Get Login Help' })).toBeInTheDocument();
    expect(screen.queryByText('captain@example.test')).not.toBeInTheDocument();
  });

  it('prevents duplicate logout requests while showing a scoped busy state', async () => {
    let resolveLogout: (() => void) | undefined;
    const post = mockBootstrap(captain);
    post.mockImplementation(async (url) => {
      if (url === '/auth/refresh')
        return { data: { data: { accessToken: 'access-menu', user: captain } } };
      return new Promise((resolve) => {
        resolveLogout = () => resolve({ data: { success: true } });
      });
    });
    renderShell();
    const trigger = await screen.findByRole('button', { name: 'Account and help' });
    await waitFor(() => expect(trigger).toHaveTextContent('CE'));
    fireEvent.click(trigger);
    const logoutButton = screen.getByRole('menuitem', { name: 'Logout' });
    fireEvent.click(logoutButton);
    fireEvent.click(logoutButton);
    expect(screen.getByRole('menuitem', { name: 'Logging out…' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(trigger).not.toBeDisabled();
    expect(post.mock.calls.filter(([url]) => url === '/auth/logout')).toHaveLength(1);
    resolveLogout?.();
  });

  it('keeps the session and presents a localized retryable action after logout failure', async () => {
    const post = mockBootstrap(captain);
    post.mockImplementation(async (url) => {
      if (url === '/auth/refresh')
        return { data: { data: { accessToken: 'access-menu', user: captain } } };
      throw new Error('network');
    });
    renderShell();
    const trigger = await screen.findByRole('button', { name: 'Account and help' });
    await waitFor(() => expect(trigger).toHaveTextContent('CE'));
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Logout' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Logout failed safely. Please try again.',
    );
    expect(screen.getByText('captain@example.test')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeEnabled();
  });

  it('switches menu labels between English and Bangla without losing auth state', async () => {
    mockBootstrap(captain);
    renderShell();
    const trigger = await screen.findByRole('button', { name: 'Account and help' });
    await waitFor(() => expect(trigger).toHaveTextContent('CE'));
    fireEvent.click(trigger);
    expect(screen.getByText('Captain: Sheet verification pending')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'বাংলা' }));
    expect(await screen.findByText('ক্যাপ্টেন: Sheet যাচাই অপেক্ষমাণ')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'লগআউট' })).toBeInTheDocument();
  });

  it('shows a retryable Bangla logout failure without dropping the session', async () => {
    const post = mockBootstrap(captain);
    post.mockImplementation(async (url) => {
      if (url === '/auth/refresh')
        return { data: { data: { accessToken: 'access-menu', user: captain } } };
      throw new Error('network');
    });
    renderShell();
    const trigger = await screen.findByRole('button', { name: 'Account and help' });
    await waitFor(() => expect(trigger).toHaveTextContent('CE'));
    fireEvent.click(screen.getByRole('button', { name: 'বাংলা' }));
    fireEvent.click(screen.getByRole('button', { name: 'অ্যাকাউন্ট ও সহায়তা' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'লগআউট' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'নিরাপদভাবে লগআউট করা যায়নি। আবার চেষ্টা করুন।',
    );
    expect(screen.getByText('captain@example.test')).toBeInTheDocument();
  });
});
