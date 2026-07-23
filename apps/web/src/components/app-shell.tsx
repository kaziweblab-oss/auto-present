import { CircleHelp, Download, Home, LoaderCircle, LogOut, Menu, Unplug } from 'lucide-react';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { NavigationEffects } from '@/components/navigation-effects';
import { RouteLoadingFallback } from '@/components/route-loading-fallback';
import { SiteFooter } from '@/components/site-footer';
import { GoogleDisconnectDialog } from '@/components/google-disconnect-dialog';
import { useAuth } from '@/providers/auth-provider';

const ThemeSelector = lazy(() =>
  import('@/components/theme-selector').then((module) => ({
    default: module.ThemeSelector,
  })),
);

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AppShell(): ReactNode {
  const { i18n, t } = useTranslation();
  const {
    status,
    user,
    logout,
    isLoggingOut,
    logoutErrorCode,
    googleConnection,
    disconnectGoogle,
    isDisconnectingGoogle,
    disconnectGoogleErrorCode,
  } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const authenticated = status === 'authenticated' && user !== null;

  const closeMenu = useCallback((restoreFocus = false): void => {
    setMenuOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Element && target.closest('[role="alertdialog"]')) return;
      if (
        target instanceof Node &&
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      )
        closeMenu(true);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeMenu, menuOpen]);

  useEffect(() => {
    if (!authenticated) setMenuOpen(false);
  }, [authenticated]);

  const changeLanguage = (language: 'en' | 'bn'): void => {
    void i18n.changeLanguage(language);
    localStorage.setItem('auto-present-language', language);
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = [
      ...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ].filter((item) => !item.hasAttribute('disabled'));
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === 'ArrowDown'
        ? (current + 1) % items.length
        : (current - 1 + items.length) % items.length;
    event.preventDefault();
    items[next]?.focus();
  };

  const handleLogout = async (): Promise<void> => {
    if (isLoggingOut) return;
    const succeeded = await logout();
    if (succeeded) {
      closeMenu();
      void navigate('/', { replace: true });
    }
  };
  const handleDisconnect = async (): Promise<void> => {
    const succeeded = await disconnectGoogle();
    if (succeeded) {
      setDisconnectOpen(false);
      closeMenu();
      void navigate('/', { replace: true });
    }
  };

  const requestedRole = user?.requestedRole;
  const isAdmin = user?.roles.includes('ADMIN') ?? false;
  const role = isAdmin ? 'ADMIN' : (requestedRole ?? user?.roles[0]);
  const roleStatus = isAdmin
    ? 'menu.adminAuthorized'
    : requestedRole === 'ADMIN'
      ? 'menu.adminDenied'
      : requestedRole === 'CAPTAIN'
        ? 'menu.captainPending'
        : 'menu.studentPending';

  return (
    <div className="app-frame">
      <header className="site-header">
        <Link className="brand" to="/" aria-label={t('app.name')}>
          <img src="/branding/app-icon.png" alt="" />
          <span>{t('app.name')}</span>
        </Link>
        <nav aria-label="Primary navigation">
          <NavLink to="/">
            <Home size={17} />
            {t('nav.home')}
          </NavLink>
          <NavLink to="/how-to-login">
            <CircleHelp size={17} />
            {t('nav.loginHelp')}
          </NavLink>
          <NavLink to="/downloads">
            <Download size={17} />
            {t('nav.downloads')}
          </NavLink>
        </nav>
        <div className="header-actions">
          <div
            className="segmented"
            data-language={i18n.language.startsWith('bn') ? 'bn' : 'en'}
            aria-label={t('language')}
          >
            <button
              className={i18n.language === 'en' ? 'active' : ''}
              type="button"
              aria-pressed={i18n.language === 'en'}
              onClick={() => changeLanguage('en')}
            >
              EN
            </button>
            <button
              className={i18n.language.startsWith('bn') ? 'active' : ''}
              type="button"
              aria-pressed={i18n.language.startsWith('bn')}
              onClick={() => changeLanguage('bn')}
            >
              বাংলা
            </button>
          </div>
          <Suspense
            fallback={
              <span
                className="theme-trigger theme-trigger-placeholder"
                role="status"
                aria-label={t('theme.label')}
                aria-busy="true"
              />
            }
          >
            <ThemeSelector />
          </Suspense>
          <div className="profile-menu">
            <button
              ref={triggerRef}
              type="button"
              aria-label={t('menu.label')}
              aria-expanded={menuOpen}
              aria-controls="account-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {authenticated && user.avatarUrl ? (
                <img
                  className="menu-trigger-avatar"
                  src={user.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : authenticated ? (
                <span className="menu-trigger-initials" aria-hidden="true">
                  {initials(user.displayName)}
                </span>
              ) : (
                <Menu aria-hidden="true" size={20} />
              )}
            </button>
            {menuOpen && (
              <div
                ref={panelRef}
                id="account-menu"
                className="menu-panel"
                role="menu"
                aria-label={t('menu.label')}
                onKeyDown={handleMenuKeyDown}
              >
                {authenticated ? (
                  <>
                    <div className="menu-identity">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="menu-avatar-fallback" aria-hidden="true">
                          {initials(user.displayName)}
                        </span>
                      )}
                      <div>
                        <strong>{user.displayName}</strong>
                        <span>{user.email}</span>
                        {role && <span>{t(`roles.${role}`)}</span>}
                      </div>
                    </div>
                    <p className="menu-role-status">{t(roleStatus)}</p>
                    {(requestedRole === 'CAPTAIN' || requestedRole === 'STUDENT') && (
                      <Link role="menuitem" to="/auth/result" onClick={() => closeMenu()}>
                        {t('menu.viewStatus')}
                      </Link>
                    )}
                    <Link role="menuitem" to="/support" onClick={() => closeMenu()}>
                      {t('footer.links.helpCenter')}
                    </Link>
                    <Link role="menuitem" to="/privacy" onClick={() => closeMenu()}>
                      {t('footer.links.privacy')}
                    </Link>
                    <button
                      className="menu-disconnect"
                      role="menuitem"
                      type="button"
                      onClick={() => setDisconnectOpen(true)}
                    >
                      <Unplug aria-hidden="true" size={16} />
                      {t('disconnect.action')}
                    </button>
                    <div className="menu-connection-state">
                      <span>{t('disconnect.identityConnected')}</span>
                      <span>
                        {t(
                          googleConnection?.status === 'CONNECTED'
                            ? 'disconnect.workspaceConnected'
                            : googleConnection
                              ? 'disconnect.workspaceNotConnected'
                              : 'disconnect.connectionChecking',
                        )}
                      </span>
                    </div>
                    <button
                      className="menu-logout"
                      role="menuitem"
                      type="button"
                      disabled={isLoggingOut}
                      aria-busy={isLoggingOut}
                      onClick={() => void handleLogout()}
                    >
                      {isLoggingOut ? (
                        <LoaderCircle className="spin" aria-hidden="true" size={16} />
                      ) : (
                        <LogOut aria-hidden="true" size={16} />
                      )}
                      {t(isLoggingOut ? 'menu.loggingOut' : 'menu.logout')}
                    </button>
                    {logoutErrorCode && (
                      <p className="menu-error" role="alert">
                        {t('menu.logoutFailed')}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <Link role="menuitem" to="/how-to-login" onClick={() => closeMenu()}>
                      {t('menu.loginHelp')}
                    </Link>
                    <Link role="menuitem" to="/support" onClick={() => closeMenu()}>
                      {t('footer.links.helpCenter')}
                    </Link>
                    <Link role="menuitem" to="/privacy" onClick={() => closeMenu()}>
                      {t('footer.links.privacy')}
                    </Link>
                    <Link role="menuitem" to="/terms" onClick={() => closeMenu()}>
                      {t('footer.links.terms')}
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
          {disconnectOpen && (
            <GoogleDisconnectDialog
              busy={isDisconnectingGoogle}
              errorCode={disconnectGoogleErrorCode}
              onCancel={() => setDisconnectOpen(false)}
              onConfirm={() => void handleDisconnect()}
            />
          )}
        </div>
      </header>
      <NavigationEffects />
      <main tabIndex={-1}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
