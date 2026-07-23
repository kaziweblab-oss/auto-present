import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { publicConfig } from '@/lib/public-config';

interface FooterLink {
  labelKey: string;
  to?: string;
  externalUrl?: string;
}

function FooterLinkList({ links }: { links: FooterLink[] }): ReactNode {
  const { t } = useTranslation();

  return (
    <ul>
      {links.map((link) => (
        <li key={link.labelKey}>
          {link.to ? (
            <Link to={link.to}>{t(link.labelKey)}</Link>
          ) : link.externalUrl ? (
            <a href={link.externalUrl} target="_blank" rel="noopener noreferrer">
              {t(link.labelKey)}
            </a>
          ) : (
            <span className="footer-disabled">{t(link.labelKey)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter(): ReactNode {
  const { t } = useTranslation();
  const quickLinks: FooterLink[] = [
    { labelKey: 'footer.links.home', to: '/' },
    { labelKey: 'footer.links.chooseRole', to: '/#roles' },
    { labelKey: 'footer.links.loginHelp', to: '/how-to-login' },
    { labelKey: 'footer.links.downloads', to: '/downloads' },
    { labelKey: 'footer.links.systemStatus', to: '/#system-status' },
  ];
  const supportLinks: FooterLink[] = [
    { labelKey: 'footer.links.helpCenter', to: '/support' },
    { labelKey: 'footer.links.googlePermissions', to: '/help/google-permissions' },
    {
      labelKey: 'footer.links.reportProblem',
      ...(publicConfig.reportProblemUrl ? { externalUrl: publicConfig.reportProblemUrl } : {}),
    },
    { labelKey: 'footer.links.tutorial', to: '/how-to-login' },
  ];

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <section className="footer-brand" aria-labelledby="footer-brand-title">
          <Link to="/" className="footer-brand-lockup">
            <img src="/branding/app-icon.png" alt="" />
            <strong id="footer-brand-title">Auto Present</strong>
          </Link>
          <p>{t('footer.description')}</p>
          {publicConfig.socialLinks.length > 0 && (
            <div className="footer-socials" aria-label={t('footer.socialLinks')}>
              {publicConfig.socialLinks.map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </section>
        <section>
          <h2>{t('footer.quickLinks')}</h2>
          <FooterLinkList links={quickLinks} />
        </section>
        <section>
          <h2>{t('footer.support')}</h2>
          <FooterLinkList links={supportLinks} />
        </section>
        <section>
          <h2>{t('footer.legal')}</h2>
          <FooterLinkList
            links={[
              { labelKey: 'footer.links.privacy', to: '/privacy' },
              { labelKey: 'footer.links.terms', to: '/terms' },
            ]}
          />
        </section>
      </div>
      <div className="footer-bottom">
        <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
        <span>{t('footer.maintainer')}</span>
      </div>
    </footer>
  );
}
