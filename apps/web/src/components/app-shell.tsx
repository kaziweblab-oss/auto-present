import { CircleHelp, Download, Home, Menu } from 'lucide-react';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { SiteFooter } from '@/components/site-footer';
import { RouteLoadingFallback } from '@/components/route-loading-fallback';

const ThemeSelector = lazy(() =>
  import('@/components/theme-selector').then((module) => ({
    default: module.ThemeSelector,
  })),
);

export function AppShell(): ReactNode {
  const { i18n, t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const changeLanguage = (language: 'en' | 'bn'): void => {
    void i18n.changeLanguage(language);
    localStorage.setItem('auto-present-language', language);
  };

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
          <div className="segmented" aria-label={t('language')}>
            <button
              className={i18n.language === 'en' ? 'active' : ''}
              type="button"
              onClick={() => changeLanguage('en')}
            >
              EN
            </button>
            <button
              className={i18n.language === 'bn' ? 'active' : ''}
              type="button"
              onClick={() => changeLanguage('bn')}
            >
              বা
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
              type="button"
              aria-label={t('menu.label')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Menu aria-hidden="true" size={20} />
            </button>
            {menuOpen && (
              <div className="menu-panel">
                <span>{t('menu.profile')}</span>
                <Link to="/how-to-login" onClick={() => setMenuOpen(false)}>
                  {t('menu.help')}
                </Link>
                <Link to="/support" onClick={() => setMenuOpen(false)}>
                  {t('footer.links.helpCenter')}
                </Link>
                <Link to="/privacy" onClick={() => setMenuOpen(false)}>
                  {t('footer.links.privacy')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
      <main>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
