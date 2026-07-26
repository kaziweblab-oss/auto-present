import type { StudentStatusResponse } from '@auto-present/shared';
import {
  BarChart3,
  Bell,
  CalendarCheck,
  ChevronRight,
  CircleHelp,
  Download,
  Home,
  LoaderCircle,
  LogOut,
  Menu,
  Shield,
  TrendingUp,
  Unplug,
  UserCheck,
  X,
} from 'lucide-react';
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
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DrawerNavItem, DrawerPreviewItem } from '@/components/drawer-nav-item';
import { NavigationEffects } from '@/components/navigation-effects';
import { PreviewDialog } from '@/components/preview-dialog';
import { RouteLoadingFallback } from '@/components/route-loading-fallback';
import { SectionLabel } from '@/components/section-label';
import { RoleSwitch } from '@/components/role-switch';
import { SidebarNavItem } from '@/components/sidebar-nav-item';
import { SiteFooter } from '@/components/site-footer';
import { StatusBadge } from '@/components/status-badge';
import { GoogleDisconnectDialog } from '@/components/google-disconnect-dialog';
import { apiClient } from '@/lib/api';
import { setItem } from '@/lib/storage';
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
    switchRole,
    logout,
    isLoggingOut,
    logoutErrorCode,
    googleConnection,
    disconnectGoogle,
    isDisconnectingGoogle,
    disconnectGoogleErrorCode,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const publicRoutes = [
    '/',
    '/how-to-login',
    '/downloads',
    '/privacy',
    '/terms',
    '/support',
    '/help/google-permissions',
    '/auth/result',
  ];
  const isPublicRoute = publicRoutes.includes(location.pathname);
  const [guestMenuOpen, setGuestMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [studentVerified, setStudentVerified] = useState<boolean | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const guestTriggerRef = useRef<HTMLButtonElement>(null);
  const guestPanelRef = useRef<HTMLDivElement>(null);
  const drawerPanelRef = useRef<HTMLDivElement>(null);
  const authenticated = status === 'authenticated' && user !== null;

  const requestedRole = user?.requestedRole;

  useEffect(() => {
    if (requestedRole !== 'STUDENT') {
      setStudentVerified(null);
      return;
    }
    let active = true;
    apiClient
      .get<{ success: true; data: StudentStatusResponse }>('/student/status')
      .then((res) => {
        if (active) setStudentVerified(res.data.data.identity.status === 'CONFIRMED');
      })
      .catch(() => {
        if (active) setStudentVerified(false);
      });
    return () => {
      active = false;
    };
  }, [requestedRole]);

  const closeDrawer = useCallback((restoreFocus = false): void => {
    setDrawerOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!guestMenuOpen) return;
    guestPanelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (
        target instanceof Node &&
        !guestPanelRef.current?.contains(target) &&
        !guestTriggerRef.current?.contains(target)
      ) {
        setGuestMenuOpen(false);
        guestTriggerRef.current?.focus();
      }
    };
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setGuestMenuOpen(false);
        guestTriggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [guestMenuOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = 'hidden';
    drawerPanelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Element && target.closest('[role="alertdialog"]')) return;
      if (
        target instanceof Node &&
        !drawerPanelRef.current?.contains(target) &&
        target instanceof Element &&
        !target.closest('[data-profile-trigger]')
      )
        closeDrawer(true);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer(true);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeDrawer, drawerOpen]);

  useEffect(() => {
    if (!authenticated) {
      setDrawerOpen(false);
      setMobileSidebarOpen(false);
    } else {
      setGuestMenuOpen(false);
    }
  }, [authenticated]);

  const changeLanguage = (language: 'en' | 'bn'): void => {
    void i18n.changeLanguage(language);
    setItem('language', language);
  };

  const handleLogout = async (): Promise<void> => {
    if (isLoggingOut) return;
    const succeeded = await logout();
    if (succeeded) {
      closeDrawer();
      void navigate('/', { replace: true });
    }
  };

  const handleDisconnect = async (): Promise<void> => {
    const succeeded = await disconnectGoogle();
    if (succeeded) {
      setDisconnectOpen(false);
      closeDrawer();
      void navigate('/', { replace: true });
    }
  };

  const isAdmin = user?.roles.includes('ADMIN') ?? false;
  const role = isAdmin ? 'ADMIN' : (requestedRole ?? user?.roles[0]);
  const roleStatus = isAdmin
    ? 'menu.adminAuthorized'
    : requestedRole === 'ADMIN'
      ? 'menu.adminDenied'
      : requestedRole === 'CAPTAIN'
        ? 'menu.captainPending'
        : studentVerified
          ? 'menu.studentVerified'
          : 'menu.studentPending';

  const isStudentPending = requestedRole === 'STUDENT' && studentVerified === false;
  const isStudentVerified = requestedRole === 'STUDENT' && studentVerified === true;

  const badgetVariant = isAdmin
    ? 'admin'
    : requestedRole === 'CAPTAIN'
      ? 'captain'
      : studentVerified
        ? 'verified'
        : 'pending';

  const drawerMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
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

  const openPreview = useCallback((): void => {
    setPreviewOpen(true);
  }, []);

  if (!authenticated) {
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
                ref={guestTriggerRef}
                type="button"
                aria-label={t('menu.label')}
                aria-expanded={guestMenuOpen}
                aria-controls="guest-menu"
                onClick={() => setGuestMenuOpen((open) => !open)}
              >
                <Menu aria-hidden="true" size={20} />
              </button>
              {guestMenuOpen && (
                <div
                  ref={guestPanelRef}
                  id="guest-menu"
                  className="menu-panel"
                  role="menu"
                  aria-label={t('menu.label')}
                  onKeyDown={(event) => {
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
                  }}
                >
                  <Link role="menuitem" to="/how-to-login" onClick={() => setGuestMenuOpen(false)}>
                    {t('menu.loginHelp')}
                  </Link>
                  <Link role="menuitem" to="/support" onClick={() => setGuestMenuOpen(false)}>
                    {t('footer.links.helpCenter')}
                  </Link>
                  <Link role="menuitem" to="/privacy" onClick={() => setGuestMenuOpen(false)}>
                    {t('footer.links.privacy')}
                  </Link>
                  <Link role="menuitem" to="/terms" onClick={() => setGuestMenuOpen(false)}>
                    {t('footer.links.terms')}
                  </Link>
                </div>
              )}
            </div>
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

  return (
    <div className="app-shell-authenticated">
      {mobileSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setMobileSidebarOpen(false);
          }}
          role="presentation"
        />
      )}
      <aside
        className={`app-sidebar${mobileSidebarOpen ? ' mobile-open' : ''}`}
        aria-label={t('menu.openNavigation')}
      >
        <div className="app-sidebar-header">
          <Link
            to="/"
            aria-label={t('app.name')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              textDecoration: 'none',
            }}
          >
            <img src="/branding/app-icon.png" alt="" className="brand-icon" />
            <span className="brand-name">{t('app.name')}</span>
          </Link>
        </div>
        <nav className="app-sidebar-nav" aria-label={t('menu.openNavigation')}>
          {isStudentPending && (
            <SidebarNavItem
              to="/student"
              icon={<UserCheck />}
              label={t('menu.completeVerification')}
            />
          )}
          {isStudentVerified && (
            <SidebarNavItem to="/student" icon={<CalendarCheck />} label={t('menu.myAttendance')} />
          )}
          {requestedRole === 'CAPTAIN' && (
            <>
              <SidebarNavItem
                to="/captain/setup"
                icon={<Shield />}
                label={t('menu.captainDashboard')}
              />
              <SidebarNavItem
                to="/captain/setup?changeSheet=true"
                icon={<Shield />}
                label={t('menu.sheetStatus')}
              />
            </>
          )}
          <div className="sidebar-section-divider" />
          <button className="sidebar-preview-item" type="button" onClick={openPreview}>
            <BarChart3 aria-hidden="true" />
            <span>{t('menu.reports')}</span>
            <span className="coming-soon-badge">{t('menu.comingSoon')}</span>
          </button>
          <button className="sidebar-preview-item" type="button" onClick={openPreview}>
            <TrendingUp aria-hidden="true" />
            <span>{t('menu.analytics')}</span>
            <span className="coming-soon-badge">{t('menu.comingSoon')}</span>
          </button>
          <button className="sidebar-preview-item" type="button" onClick={openPreview}>
            <Bell aria-hidden="true" />
            <span>{t('menu.notifications')}</span>
            <span className="coming-soon-badge">{t('menu.comingSoon')}</span>
          </button>
        </nav>
        <div className="app-sidebar-footer">
          {user?.loginRole === 'CAPTAIN' && !isPublicRoute && (
            <RoleSwitch
              requestedRole={requestedRole === 'CAPTAIN' ? 'CAPTAIN' : 'STUDENT'}
              disabled={isSwitching}
              onSwitch={() => {
                setIsSwitching(true);
                const target = requestedRole === 'CAPTAIN' ? 'STUDENT' : 'CAPTAIN';
                void switchRole(target).then((result) => {
                  setIsSwitching(false);
                  if (result.success) {
                    const dest =
                      result.user.requestedRole === 'STUDENT' ? '/student' : '/captain/setup';
                    void navigate(dest);
                  }
                });
              }}
            />
          )}
          <Suspense fallback={null}>
            <ThemeSelector />
          </Suspense>
        </div>
      </aside>
      <div className="app-main-area">
        <header className="app-header">
          <button
            className="mobile-sidebar-trigger"
            type="button"
            aria-label={t('menu.openNavigation')}
            aria-expanded={mobileSidebarOpen}
            onClick={() => setMobileSidebarOpen((o) => !o)}
          >
            {mobileSidebarOpen ? (
              <X size={20} aria-hidden="true" />
            ) : (
              <Menu size={20} aria-hidden="true" />
            )}
          </button>
          <div className="app-header-actions">
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
            <button
              ref={triggerRef}
              type="button"
              className="profile-trigger"
              aria-label={t('menu.openAccount')}
              aria-expanded={drawerOpen}
              aria-controls="profile-drawer"
              data-profile-trigger
              onClick={() => setDrawerOpen((open) => !open)}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="profile-trigger-initials" aria-hidden="true">
                  {initials(user.displayName)}
                </span>
              )}
            </button>
          </div>
        </header>
        <main className="app-content" tabIndex={-1}>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => closeDrawer(true)} role="presentation" />
      )}
      {drawerOpen && (
        <div
          ref={drawerPanelRef}
          id="profile-drawer"
          className="drawer-panel"
          role="menu"
          aria-label={t('menu.openAccount')}
          onKeyDown={drawerMenuKeyDown}
        >
          <div className="drawer-header">
            <strong style={{ fontSize: '0.95rem' }}>{t('menu.account')}</strong>
            <button
              type="button"
              className="drawer-close"
              aria-label={t('menu.closeAccount')}
              onClick={() => closeDrawer(true)}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="drawer-profile">
            <div className="drawer-avatar">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                initials(user.displayName)
              )}
            </div>
            <div className="drawer-profile-info">
              <strong>{user.displayName}</strong>
              <span>{user.email}</span>
              <span>
                {role && t(`roles.${role}`)}{' '}
                <StatusBadge variant={badgetVariant} label={t(roleStatus)} />
              </span>
            </div>
          </div>
          <div className="drawer-body">
            <SectionLabel>{t('menu.academic')}</SectionLabel>
            {isStudentPending && (
              <DrawerNavItem to="/student" icon={<UserCheck />} onClick={() => closeDrawer()}>
                {t('menu.completeVerification')}
              </DrawerNavItem>
            )}
            {isStudentVerified && (
              <DrawerNavItem to="/student" icon={<CalendarCheck />} onClick={() => closeDrawer()}>
                {t('menu.myAttendance')}
              </DrawerNavItem>
            )}
            {requestedRole === 'CAPTAIN' && (
              <>
                <DrawerNavItem to="/captain/setup" icon={<Shield />} onClick={() => closeDrawer()}>
                  {t('menu.captainDashboard')}
                </DrawerNavItem>
                <DrawerNavItem
                  to="/captain/setup?changeSheet=true"
                  icon={<Shield />}
                  onClick={() => closeDrawer()}
                >
                  {t('menu.sheetStatus')}
                </DrawerNavItem>
              </>
            )}
            <DrawerPreviewItem
              icon={<BarChart3 />}
              label={t('menu.reports')}
              onClick={openPreview}
            />
            <DrawerPreviewItem
              icon={<TrendingUp />}
              label={t('menu.analytics')}
              onClick={openPreview}
            />
            <DrawerPreviewItem
              icon={<Bell />}
              label={t('menu.notifications')}
              onClick={openPreview}
            />
            <SectionLabel>{t('menu.general')}</SectionLabel>
            <DrawerNavItem to="/support" icon={<CircleHelp />} onClick={() => closeDrawer()}>
              {t('footer.links.helpCenter')}
            </DrawerNavItem>
            <DrawerNavItem to="/privacy" icon={<Shield />} onClick={() => closeDrawer()}>
              {t('footer.links.privacy')}
            </DrawerNavItem>
            <div className="drawer-separator" />
            <button
              className="drawer-nav-item danger"
              role="menuitem"
              type="button"
              onClick={() => setDisconnectOpen(true)}
            >
              <Unplug aria-hidden="true" size={18} />
              <span>{t('disconnect.action')}</span>
              <ChevronRight className="nav-chevron" aria-hidden="true" />
            </button>
            <div className="connection-state">
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
              className="drawer-nav-item danger"
              role="menuitem"
              type="button"
              disabled={isLoggingOut}
              aria-busy={isLoggingOut}
              onClick={() => void handleLogout()}
            >
              {isLoggingOut ? (
                <LoaderCircle className="spin" aria-hidden="true" size={18} />
              ) : (
                <LogOut aria-hidden="true" size={18} />
              )}
              <span>{t(isLoggingOut ? 'menu.loggingOut' : 'menu.logout')}</span>
              {!isLoggingOut && <ChevronRight className="nav-chevron" aria-hidden="true" />}
            </button>
            {logoutErrorCode && (
              <p className="drawer-error" role="alert">
                {t('menu.logoutFailed')}
              </p>
            )}
          </div>
        </div>
      )}
      {disconnectOpen && (
        <GoogleDisconnectDialog
          busy={isDisconnectingGoogle}
          errorCode={disconnectGoogleErrorCode}
          onCancel={() => setDisconnectOpen(false)}
          onConfirm={() => void handleDisconnect()}
        />
      )}
      {previewOpen && <PreviewDialog onClose={() => setPreviewOpen(false)} />}
      <NavigationEffects />
    </div>
  );
}
