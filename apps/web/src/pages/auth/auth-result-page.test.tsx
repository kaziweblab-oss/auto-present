import type { AuthUser } from '@auto-present/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { AuthResultPage } from './auth-result-page';

const mockUseAuth = vi.fn();
vi.mock('@/providers/auth-provider', () => ({ useAuth: () => mockUseAuth() }));

const base = {
  status: 'authenticated',
  refresh: vi.fn(),
  logout: vi.fn(),
  startSignIn: vi.fn(),
  pendingRoles: [],
  errorCode: null,
};
const identity = (roles: AuthUser['roles']): AuthUser => ({
  id: 'user',
  email: 'user@example.test',
  displayName: 'Test User',
  roles,
});

describe('OAuth result states', () => {
  beforeEach(() => mockUseAuth.mockReturnValue({ ...base, user: identity([]) }));

  it('redirects a student with pending identity to the student page without leaking tokens', () => {
    mockUseAuth.mockReturnValue({
      ...base,
      user: { ...identity([]), requestedRole: 'STUDENT' },
    });
    render(
      <MemoryRouter initialEntries={['/auth/result?code=google-code&id_token=secret']}>
        <Routes>
          <Route path="/auth/result" element={<AuthResultPage />} />
          <Route path="/student" element={<p>Student onboarding</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Student onboarding')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('google-code');
    expect(document.body.textContent).not.toContain('secret');
  });

  it('routes a verified Captain identity into Sheet onboarding', () => {
    mockUseAuth.mockReturnValue({
      ...base,
      user: { ...identity([]), requestedRole: 'CAPTAIN' },
    });
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<AuthResultPage />} />
          <Route path="/captain/setup" element={<p>Captain Sheet onboarding</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Captain Sheet onboarding')).toBeInTheDocument();
  });

  it('shows authorized Admin state', () => {
    mockUseAuth.mockReturnValue({ ...base, user: identity(['ADMIN']) });
    render(
      <MemoryRouter>
        <AuthResultPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/administrator membership is active/i)).toBeInTheDocument();
  });

  it('localizes known errors and safely falls back for unknown errors', async () => {
    const i18n = (await import('@/i18n')).default;
    await i18n.changeLanguage('en');
    const { unmount } = render(
      <MemoryRouter initialEntries={['/auth/result?error=access_denied']}>
        <AuthResultPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Google consent was declined.')).toBeInTheDocument();
    unmount();
    render(
      <MemoryRouter initialEntries={['/auth/result?error=unknown_code']}>
        <AuthResultPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Authentication failed safely/i)).toBeInTheDocument();
    await i18n.changeLanguage('bn');
    expect(i18n.t('auth.errors.SESSION_EXPIRED')).toContain('সেশনের মেয়াদ');
    await i18n.changeLanguage('en');
  });

  it('renders denied Admin recovery without granting a session or showing Logout', () => {
    const startSignIn = vi.fn();
    mockUseAuth.mockReturnValue({
      ...base,
      status: 'anonymous',
      user: null,
      startSignIn,
    });
    render(
      <MemoryRouter
        initialEntries={[
          '/auth/result?error=ADMIN_ACCESS_DENIED&role=ADMIN&requestId=request-safe-1',
        ]}
      >
        <AuthResultPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText('This account has no active administrator membership.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Reference: request-safe-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try another Google account' }));
    expect(startSignIn).toHaveBeenCalledTimes(1);
    expect(startSignIn).toHaveBeenCalledWith('ADMIN');
    expect(screen.queryByText(/membership is active/i)).not.toBeInTheDocument();
  });

  it('returns to role selection and focuses the role section', async () => {
    mockUseAuth.mockReturnValue({ ...base, status: 'anonymous', user: null });
    render(
      <MemoryRouter initialEntries={['/auth/result?error=access_denied&role=CAPTAIN']}>
        <Routes>
          <Route path="/auth/result" element={<AuthResultPage />} />
          <Route
            path="/"
            element={
              <section id="roles" tabIndex={-1}>
                Role selection destination
              </section>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back to role selection' }));
    const roles = await screen.findByText('Role selection destination');
    await waitFor(() => expect(roles).toHaveFocus());
  });

  it('disables duplicate account retry while the original role request is pending', () => {
    const startSignIn = vi.fn();
    mockUseAuth.mockReturnValue({
      ...base,
      status: 'anonymous',
      user: null,
      pendingRoles: ['ADMIN'],
      startSignIn,
    });
    render(
      <MemoryRouter initialEntries={['/auth/result?error=ADMIN_ACCESS_DENIED&role=ADMIN']}>
        <AuthResultPage />
      </MemoryRouter>,
    );
    const retry = screen.getByRole('button', { name: 'Starting securely…' });
    expect(retry).toBeDisabled();
    expect(retry).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(retry);
    expect(startSignIn).not.toHaveBeenCalled();
  });

  it('keeps the denial visible and shows a retryable message when OAuth restart fails', () => {
    mockUseAuth.mockReturnValue({
      ...base,
      status: 'anonymous',
      user: null,
      errorCode: 'AUTH_START_FAILED',
    });
    render(
      <MemoryRouter initialEntries={['/auth/result?error=ADMIN_ACCESS_DENIED&role=ADMIN']}>
        <AuthResultPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText('This account has no active administrator membership.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Could not start a new Google sign-in. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try another Google account' })).toBeEnabled();
  });
});
