import type { UserRole } from '@auto-present/shared';
import {
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SystemStatus } from '@/components/system-status';
import { useAuth } from '@/providers/auth-provider';

const roleIcons = {
  STUDENT: UserRound,
  CAPTAIN: UsersRound,
  ADMIN: ShieldCheck,
} as const;
const roles: UserRole[] = ['STUDENT', 'CAPTAIN', 'ADMIN'];

export function WelcomePage(): ReactNode {
  const { t } = useTranslation();
  const { status, startSignIn, errorCode, pendingRoles } = useAuth();

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
      <section className="role-section" id="roles" aria-labelledby="role-heading" tabIndex={-1}>
        <div className="section-heading">
          <p className="eyebrow">{t('welcome.roleEyebrow')}</p>
          <h2 id="role-heading">{t('welcome.roleTitle')}</h2>
          <p>{t('welcome.futureAction')}</p>
          {errorCode ? <p role="alert">{t('auth.errors.AUTH_START_FAILED')}</p> : null}
        </div>
        <div className="role-grid">
          {roles.map((role) => {
            const Icon = roleIcons[role];
            const isStarting = pendingRoles.includes(role);
            const isDisabled = status === 'loading' || isStarting;
            const descriptionId = `role-${role.toLowerCase()}-action-state`;
            return (
              <article className="role-card" key={role}>
                <span className="role-icon">
                  <Icon aria-hidden="true" />
                </span>
                <h3>{t(`roles.${role}`)}</h3>
                <p>{t(`roles.${role}_DESCRIPTION`)}</p>
                <button
                  type="button"
                  disabled={isDisabled}
                  aria-busy={isStarting}
                  aria-describedby={isDisabled ? descriptionId : undefined}
                  onClick={() => void startSignIn(role)}
                >
                  <span>{isStarting ? t('auth.starting') : t('auth.signIn')}</span>
                  {isStarting ? (
                    <LoaderCircle className="role-action-spinner" size={16} aria-hidden="true" />
                  ) : (
                    <ArrowRight className="role-action-arrow" size={16} aria-hidden="true" />
                  )}
                </button>
                <span className="sr-only" id={descriptionId}>
                  {status === 'loading' ? t('auth.bootstrapDisabled') : t('auth.requestPending')}
                </span>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
