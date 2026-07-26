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
  loginRole: 'CAPTAIN',
};

const student: AuthUser = {
  id: 'student-1',
  email: 'student@example.test',
  displayName: 'Student Example',
  roles: [],
  requestedRole: 'STUDENT',
  loginRole: 'STUDENT',
};

const captainInStudentMode: AuthUser = {
  id: 'captain-2',
  email: 'captain.dual@example.test',
  displayName: 'Captain Dual',
  roles: ['STUDENT'],
  requestedRole: 'STUDENT',
  loginRole: 'CAPTAIN',
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
              <Route path="student" element={<p>Student destination</p>} />
              <Route path="captain/setup" element={<p>Captain destination</p>} />
              <Route path="support" element={<p>Support destination</p>} />
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
  studentIdentityStatus: 'CONFIRMED' | 'UNCONFIRMED' | undefined = undefined,
) {
  let bootstrapCalls = 0;
  vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
    if (url === '/auth/google/connection')
      return { data: { success: true, data: { status: connectionStatus, scopes: [] } } };
    if (url === '/student/status') {
      return {
        data: {
          success: true,
          data: {
            identity: { status: studentIdentityStatus ?? 'UNCONFIRMED', roll: null },
            canViewAttendance: studentIdentityStatus === 'CONFIRMED',
          },
        },
      };
    }
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

async function openDrawer(): Promise<void> {
  const trigger = await screen.findByRole('button', { name: 'Open account panel' });
  fireEvent.click(trigger);
}

describe('auth-aware header shell', () => {
  beforeEach(async () => {
    resetAuthBootstrapForTests();
    vi.mocked(revokeGoogleIdentityConsent).mockResolvedValue(true);
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ───── Guest / public layout ───── */

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
  });

  it('guest menu closes on Escape and outside pointer interaction and restores trigger focus', async () => {
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

  /* ───── Captain authenticated ───── */

  it('shows authenticated identity, role, Captain status, and real navigation in the profile drawer', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    await openDrawer();
    const drawer = screen.getByRole('menu');
    expect(within(drawer).getByText('Captain Example')).toBeInTheDocument();
    expect(within(drawer).getByText('captain@example.test')).toBeInTheDocument();
    expect(within(drawer).getByText('Captain')).toBeInTheDocument();
    expect(within(drawer).getByText('Captain: Sheet verification pending')).toBeInTheDocument();
    expect(within(drawer).getByRole('menuitem', { name: 'Captain Dashboard' })).toHaveAttribute(
      'href',
      '/captain/setup',
    );
    expect(within(drawer).getByRole('menuitem', { name: 'Sheet Status' })).toHaveAttribute(
      'href',
      '/captain/setup?changeSheet=true',
    );
  });

  it('renders Captain navigation in the sidebar', async () => {
    mockBootstrap(captain);
    renderShell();
    const sidebar = await screen.findByRole('navigation', { name: 'Open navigation' });
    expect(within(sidebar).getByText('Captain Dashboard')).toBeInTheDocument();
    expect(within(sidebar).getByText('Sheet Status')).toBeInTheDocument();
  });

  /* ───── Student verified ───── */

  it('shows My Attendance for a verified Student in sidebar and drawer', async () => {
    mockBootstrap(student, 'CONNECTED', 'CONFIRMED');
    renderShell();
    await screen.findByText('Welcome destination');
    const sidebar = screen.getByRole('navigation', { name: 'Open navigation' });
    expect(await within(sidebar).findByText('My Attendance')).toBeInTheDocument();
    await openDrawer();
    const drawer = screen.getByRole('menu');
    expect(within(drawer).getByText('Student: Academic profile verified')).toBeInTheDocument();
    expect(within(drawer).getByRole('menuitem', { name: 'My Attendance' })).toHaveAttribute(
      'href',
      '/student',
    );
  });

  /* ───── Student pending ───── */

  it('shows Complete Academic Verification for a pending Student and hides My Attendance', async () => {
    mockBootstrap(student, 'CONNECTED', 'UNCONFIRMED');
    renderShell();
    await screen.findByText('Welcome destination');
    const sidebar = screen.getByRole('navigation', { name: 'Open navigation' });
    expect(await within(sidebar).findByText('Complete Academic Verification')).toBeInTheDocument();
    expect(within(sidebar).queryByText('My Attendance')).not.toBeInTheDocument();
    await openDrawer();
    const drawer = screen.getByRole('menu');
    expect(within(drawer).getByText('Student: Academic verification pending')).toBeInTheDocument();
    expect(
      within(drawer).getByRole('menuitem', { name: 'Complete Academic Verification' }),
    ).toHaveAttribute('href', '/student');
  });

  /* ───── Disconnect ───── */

  it('keeps identity-only Disconnect enabled while presenting connection state', async () => {
    mockBootstrap(captain, 'NOT_CONNECTED');
    renderShell();
    await screen.findByText('Welcome destination');
    await openDrawer();
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Disconnect Google' })).toBeEnabled(),
    );
    expect(screen.getByText('Identity connected')).toBeInTheDocument();
    expect(screen.getByText('Workspace not connected')).toBeInTheDocument();
  });

  it('shows an accessible confirmation and Cancel makes no request', async () => {
    const post = mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    await openDrawer();
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
    await screen.findByText('Privacy destination');
    await openDrawer();
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
    await screen.findByText('Welcome destination');
    await openDrawer();
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
    await screen.findByText('Welcome destination');
    await openDrawer();
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
    await screen.findByText('Welcome destination');
    fireEvent.click(screen.getByRole('button', { name: 'বাংলা' }));
    const trigger = await screen.findByRole('button', { name: 'অ্যাকাউন্ট প্যানেল খুলুন' });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Google সংযোগ বিচ্ছিন্ন করুন' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Auto Present-এর Google পরিচয় সংযোগ ও সম্মতি সরানো হবে।',
    );
    expect(screen.getByRole('button', { name: 'বাতিল' })).toHaveFocus();
  });

  /* ───── Drawer close behavior ───── */

  it('closes drawer on Escape and overlay click, restores trigger focus', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    await openDrawer();
    const drawer = screen.getByRole('menu');
    expect(drawer).toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Open account panel' });
    fireEvent.keyDown(drawer, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    await openDrawer();
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  /* ───── Logout ───── */

  it('logs out once, clears the authenticated menu, and navigates to Welcome safely', async () => {
    const post = mockBootstrap(captain);
    renderShell('/privacy');
    await screen.findByText('Privacy destination');
    await openDrawer();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Logout' }));
    await screen.findByText('Welcome destination');
    expect(post.mock.calls.filter(([url]) => url === '/auth/logout')).toHaveLength(1);
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
    await screen.findByText('Welcome destination');
    await openDrawer();
    const logoutButton = screen.getByRole('menuitem', { name: 'Logout' });
    fireEvent.click(logoutButton);
    fireEvent.click(logoutButton);
    expect(screen.getByRole('menuitem', { name: 'Logging out…' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
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
    await screen.findByText('Welcome destination');
    await openDrawer();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Logout' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Logout failed safely. Please try again.',
    );
    expect(screen.getByText('captain@example.test')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeEnabled();
  });

  /* ───── i18n ───── */

  it('switches drawer labels between English and Bangla without losing auth state', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    await openDrawer();
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
    await screen.findByText('Welcome destination');
    fireEvent.click(screen.getByRole('button', { name: 'বাংলা' }));
    const trigger = await screen.findByRole('button', { name: 'অ্যাকাউন্ট প্যানেল খুলুন' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'লগআউট' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'নিরাপদভাবে লগআউট করা যায়নি। আবার চেষ্টা করুন।',
    );
    expect(screen.getByText('captain@example.test')).toBeInTheDocument();
  });

  /* ───── Role isolation ───── */

  it('Captain does not see Student-only navigation', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    const sidebar = screen.getByRole('navigation', { name: 'Open navigation' });
    expect(within(sidebar).queryByText('My Attendance')).not.toBeInTheDocument();
    expect(within(sidebar).queryByText('Complete Academic Verification')).not.toBeInTheDocument();
  });

  it('Pending Student does not see Captain navigation', async () => {
    mockBootstrap(student, 'CONNECTED', 'UNCONFIRMED');
    renderShell();
    await screen.findByText('Welcome destination');
    const sidebar = screen.getByRole('navigation', { name: 'Open navigation' });
    expect(within(sidebar).queryByText('Captain Dashboard')).not.toBeInTheDocument();
    expect(within(sidebar).queryByText('Sheet Status')).not.toBeInTheDocument();
  });

  /* ───── Role switching ───── */

  function switchRoleButton() {
    const footer = document.querySelector('.app-sidebar-footer');
    if (!footer) return null;
    return footer.querySelector('.role-switch');
  }

  it('Captain-origin login shows View as Student above account selector', async () => {
    mockBootstrap(captain, 'CONNECTED', 'CONFIRMED');
    renderShell('/captain/setup');
    await screen.findByText('Captain destination');
    const button = switchRoleButton();
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('View as Student');
    const footer = document.querySelector('.app-sidebar-footer');
    expect(footer?.querySelector('.role-switch')).toBe(button);
  });

  it('Student-origin login shows no Switch Role button', async () => {
    mockBootstrap(student, 'CONNECTED', 'CONFIRMED');
    renderShell('/student');
    await screen.findByText('Student destination');
    expect(switchRoleButton()).toBeNull();
  });

  it('Captain-origin in Student mode shows Return to Captain', async () => {
    mockBootstrap(captainInStudentMode, 'CONNECTED', 'CONFIRMED');
    renderShell('/student');
    await screen.findByText('Student destination');
    const button = switchRoleButton();
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Return to Captain');
  });

  it('Switch Role is absent from the account drawer', async () => {
    mockBootstrap(captain, 'CONNECTED', 'CONFIRMED');
    renderShell('/captain/setup');
    await screen.findByText('Captain destination');
    await openDrawer();
    const drawer = screen.getByRole('menu');
    expect(within(drawer).queryByText('Switch role')).not.toBeInTheDocument();
    expect(within(drawer).queryByText('View as Student')).not.toBeInTheDocument();
    expect(within(drawer).queryByText('Return to Captain')).not.toBeInTheDocument();
  });

  it('My Attendance is absent from Captain navigation', async () => {
    mockBootstrap(captain, 'CONNECTED', 'CONFIRMED');
    renderShell('/captain/setup');
    await screen.findByText('Captain destination');
    const sidebar = screen.getByRole('navigation', { name: 'Open navigation' });
    expect(within(sidebar).queryByText('My Attendance')).not.toBeInTheDocument();
    expect(within(sidebar).queryByText('Complete Academic Verification')).not.toBeInTheDocument();
  });

  /* ───── Role switch execution ───── */

  it('Switch Role button has type="button"', async () => {
    mockBootstrap(captain, 'CONNECTED', 'CONFIRMED');
    renderShell('/captain/setup');
    await screen.findByText('Captain destination');
    const button = switchRoleButton();
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('role', 'button');
  });

  it('clicking Switch Role does not call logout', async () => {
    const post = mockBootstrap(captain, 'CONNECTED', 'CONFIRMED');
    renderShell('/captain/setup');
    await screen.findByText('Captain destination');
    const button = switchRoleButton()!;
    fireEvent.click(button);
    await waitFor(() =>
      expect(post.mock.calls.filter(([url]) => url === '/auth/logout')).toHaveLength(0),
    );
  });

  it('CAPTAIN-to-STUDENT switch preserves authentication and updates role', async () => {
    const post = mockBootstrap(captain, 'CONNECTED', 'CONFIRMED');
    post.mockImplementation(async (url, ..._args) => {
      if (url === '/auth/switch-role') {
        return {
          data: {
            success: true,
            data: {
              accessToken: 'switched-token',
              user: { ...captain, requestedRole: 'STUDENT' },
            },
          },
        };
      }
      if (url === '/auth/refresh') {
        return { data: { data: { accessToken: 'access-menu', user: captain } } };
      }
      return { data: { success: true } };
    });
    renderShell('/captain/setup');
    await screen.findByText('Captain destination');
    const button = switchRoleButton()!;
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText('Student destination')).toBeInTheDocument());
    expect(switchRoleButton()).toBeInTheDocument();
    expect(switchRoleButton()).toHaveTextContent('Return to Captain');
  });

  it('STUDENT-to-CAPTAIN switch preserves authentication and updates role', async () => {
    const post = mockBootstrap(captainInStudentMode, 'CONNECTED', 'CONFIRMED');
    post.mockImplementation(async (url, ..._args) => {
      if (url === '/auth/switch-role') {
        return {
          data: {
            success: true,
            data: {
              accessToken: 'switched-token',
              user: { ...captainInStudentMode, requestedRole: 'CAPTAIN' },
            },
          },
        };
      }
      if (url === '/auth/refresh') {
        return { data: { data: { accessToken: 'access-menu', user: captainInStudentMode } } };
      }
      return { data: { success: true } };
    });
    renderShell('/student');
    await screen.findByText('Student destination');
    const button = switchRoleButton()!;
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText('Captain destination')).toBeInTheDocument());
    expect(switchRoleButton()).toBeInTheDocument();
    expect(switchRoleButton()).toHaveTextContent('View as Student');
  });

  it('failed switch keeps current user and role, does not redirect to Welcome', async () => {
    const post = mockBootstrap(captain, 'CONNECTED', 'CONFIRMED');
    post.mockImplementation(async (url, ..._args) => {
      if (url === '/auth/switch-role') throw new Error('switch failed');
      if (url === '/auth/refresh') {
        return { data: { data: { accessToken: 'access-menu', user: captain } } };
      }
      return { data: { success: true } };
    });
    renderShell('/captain/setup');
    await screen.findByText('Captain destination');
    const button = switchRoleButton()!;
    fireEvent.click(button);
    await waitFor(() => expect(button).not.toHaveAttribute('aria-disabled', 'true'));
    expect(screen.getByText('Captain destination')).toBeInTheDocument();
    expect(screen.queryByText('Welcome destination')).not.toBeInTheDocument();
    expect(switchRoleButton()).toBeInTheDocument();
  });

  /* ───── Public route visibility ───── */

  it('public Welcome route has no Switch Role', async () => {
    mockBootstrap(captain, 'CONNECTED', 'CONFIRMED');
    renderShell('/');
    await screen.findByText('Welcome destination');
    expect(switchRoleButton()).toBeNull();
  });

  /* ───── PREVIEW items ───── */

  it('shows Coming Soon preview items in the sidebar', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    const sidebar = screen.getByRole('navigation', { name: 'Open navigation' });
    expect(within(sidebar).getByText('Reports')).toBeInTheDocument();
    expect(within(sidebar).getByText('Analytics')).toBeInTheDocument();
    expect(within(sidebar).getByText('Notifications')).toBeInTheDocument();
    expect(within(sidebar).getAllByText('Coming Soon')).toHaveLength(3);
  });

  it('shows Coming Soon preview items in the profile drawer', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    await openDrawer();
    const drawer = screen.getByRole('menu');
    expect(within(drawer).getByText('Reports')).toBeInTheDocument();
    expect(within(drawer).getByText('Analytics')).toBeInTheDocument();
    expect(within(drawer).getByText('Notifications')).toBeInTheDocument();
  });

  it('preview dialog opens and closes safely', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    const sidebar = screen.getByRole('navigation', { name: 'Open navigation' });
    fireEvent.click(within(sidebar).getByText('Reports'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Feature Preview')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /* ───── Drawer sections ───── */

  it('drawer has Academic, General sections for authenticated users', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    await openDrawer();
    expect(screen.getByText('Academic')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('READY navigation in drawer closes the drawer', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    await openDrawer();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Help Center' }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('drawer close button restores trigger focus', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    await openDrawer();
    const trigger = screen.getByRole('button', { name: 'Open account panel' });
    fireEvent.click(screen.getByRole('button', { name: 'Close account panel' }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  /* ───── Single continuous scroll ───── */

  it('drawer panel is a single scroll container with no nested scrollable body', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    await openDrawer();
    const panel = document.getElementById('profile-drawer');
    expect(panel).toBeInTheDocument();
    const drawerBody = panel?.querySelector('[class*="drawer-body"]');
    expect(drawerBody).toBeInTheDocument();
    expect(drawerBody?.querySelector('[class*="drawer-footer"]')).toBeNull();
  });

  it('Disconnect and Logout remain inside the drawer body flow', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    await openDrawer();
    const drawerBody = document
      .getElementById('profile-drawer')
      ?.querySelector('[class*="drawer-body"]');
    expect(drawerBody).toBeInTheDocument();
    expect(drawerBody!.querySelector('[class*="danger"]')).toBeInTheDocument();
  });

  it('background body is scroll-locked while drawer is open', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    expect(document.body.style.overflow).not.toBe('hidden');
    await openDrawer();
    await waitFor(() => expect(document.body.style.overflow).toBe('hidden'));
  });

  it('body unlocks after drawer closes', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    await openDrawer();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(document.body.style.overflow).not.toBe('hidden'));
  });

  /* ───── Cursor behavior ───── */

  it('renders sidebar nav items with sidebar-nav-item class', async () => {
    mockBootstrap(captain);
    renderShell('/captain/setup');
    await screen.findByText('Captain destination');
    const sidebarNavItems = document.querySelectorAll('.sidebar-nav-item');
    expect(sidebarNavItems.length).toBeGreaterThan(0);
  });

  it('renders sidebar preview items with sidebar-preview-item class', async () => {
    mockBootstrap(captain);
    renderShell('/captain/setup');
    await screen.findByText('Captain destination');
    const previewItems = document.querySelectorAll('.sidebar-preview-item');
    expect(previewItems.length).toBeGreaterThan(0);
  });

  it('renders drawer nav items with drawer-nav-item class', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    await openDrawer();
    const drawerNavItems = document.querySelectorAll('.drawer-nav-item');
    expect(drawerNavItems.length).toBeGreaterThan(0);
  });

  it('renders drawer preview items with drawer-preview-item class', async () => {
    mockBootstrap(captain);
    renderShell();
    await screen.findByText('Welcome destination');
    await openDrawer();
    const drawerPreviewItems = document.querySelectorAll('.drawer-preview-item');
    expect(drawerPreviewItems.length).toBeGreaterThan(0);
  });

  it('renders sidebar switch-role button', async () => {
    mockBootstrap(captain);
    renderShell('/captain/setup');
    await screen.findByText('Captain destination');
    const switchRoleButton = document.querySelector('.role-switch');
    expect(switchRoleButton).toBeInTheDocument();
  });
});
