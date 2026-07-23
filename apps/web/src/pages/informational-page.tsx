import { ExternalLink, Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { publicConfig } from '@/lib/public-config';

type InformationPage = 'privacy' | 'terms' | 'support' | 'googlePermissions';

const sectionKeys: Record<InformationPage, string[]> = {
  privacy: [
    'dataCollected',
    'googleIdentity',
    'roleAccess',
    'dataUse',
    'retention',
    'tokenSecurity',
    'sharing',
    'controls',
    'removal',
    'contact',
  ],
  terms: [
    'purpose',
    'acceptableUse',
    'responsibilities',
    'availability',
    'sheetOwnership',
    'termination',
    'contact',
  ],
  support: ['helpCenter', 'loginHelp', 'reporting', 'contact'],
  googlePermissions: ['why', 'student', 'captain', 'reconnect', 'removeAccess'],
};

export function InformationalPage({ page }: { page: InformationPage }): ReactNode {
  const { t } = useTranslation();

  return (
    <article className="information-page">
      <header>
        <p className="eyebrow">{t(`information.${page}.eyebrow`)}</p>
        <h1>{t(`information.${page}.title`)}</h1>
        <p>{t(`information.${page}.intro`)}</p>
      </header>
      <div className="information-sections">
        {sectionKeys[page].map((section) => (
          <section key={section}>
            <h2>{t(`information.${page}.sections.${section}.title`)}</h2>
            <p>{t(`information.${page}.sections.${section}.body`)}</p>
          </section>
        ))}
      </div>
      {page === 'support' && (
        <aside className="support-actions" aria-label={t('information.support.actions')}>
          <Link to="/how-to-login">{t('footer.links.tutorial')}</Link>
          <Link to="/help/google-permissions">{t('footer.links.googlePermissions')}</Link>
          {publicConfig.reportProblemUrl && (
            <a href={publicConfig.reportProblemUrl} target="_blank" rel="noopener noreferrer">
              {t('footer.links.reportProblem')} <ExternalLink size={15} aria-hidden="true" />
            </a>
          )}
          {publicConfig.supportEmail && (
            <a href={`mailto:${publicConfig.supportEmail}`}>
              <Mail size={15} aria-hidden="true" /> {publicConfig.supportEmail}
            </a>
          )}
        </aside>
      )}
    </article>
  );
}
