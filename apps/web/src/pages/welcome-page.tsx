import type { UserRole } from '@auto-present/shared';
import { ArrowRight, ShieldCheck, Sparkles, UserRound, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SystemStatus } from '@/components/system-status';

const roleIcons = {
  STUDENT: UserRound,
  CAPTAIN: UsersRound,
  ADMIN: ShieldCheck,
} as const;
const roles: UserRole[] = ['STUDENT', 'CAPTAIN', 'ADMIN'];

export function WelcomePage(): ReactNode {
  const { t } = useTranslation();

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <Sparkles size={16} />
            {t('welcome.eyebrow')}
          </p>
          <h1>{t('welcome.title')}</h1>
          <p className="hero-description">{t('welcome.description')}</p>
          <SystemStatus />
        </div>
        <div className="hero-art" aria-label="Auto Present identity">
          <img src="/branding/app-icon.png" alt="Auto Present" />
        </div>
      </section>
      <section className="role-section" id="roles" aria-labelledby="role-heading">
        <div className="section-heading">
          <p className="eyebrow">Role-based access</p>
          <h2 id="role-heading">{t('welcome.roleTitle')}</h2>
          <p>{t('welcome.futureAction')}</p>
        </div>
        <div className="role-grid">
          {roles.map((role) => {
            const Icon = roleIcons[role];
            return (
              <article className="role-card" key={role}>
                <span className="role-icon">
                  <Icon aria-hidden="true" />
                </span>
                <h3>{t(`roles.${role}`)}</h3>
                <p>{t(`roles.${role}_DESCRIPTION`)}</p>
                <button type="button" disabled>
                  {t('common.unavailable')} <ArrowRight size={16} />
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
