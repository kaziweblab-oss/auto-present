import type { UserRole } from '@auto-present/shared';
import { ArrowLeft, LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/auth-provider';

export function AuthResultPage(): ReactNode {
  const { t } = useTranslation();
  const { status, user, refresh, startSignIn, pendingRoles, errorCode } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const error = params.get('error');
  const roleParam = params.get('role');
  const retryRole: UserRole | null =
    roleParam === 'ADMIN' || roleParam === 'CAPTAIN' || roleParam === 'STUDENT' ? roleParam : null;
  const requestIdParam = params.get('requestId');
  const requestId =
    requestIdParam && /^[a-zA-Z0-9._-]{1,128}$/.test(requestIdParam) ? requestIdParam : null;
  const retryPending = retryRole ? pendingRoles.includes(retryRole) : false;
  useEffect(() => {
    if (!error) void refresh();
  }, [error, refresh]);
  const backToRoles = (): void => {
    void navigate('/#roles');
    requestAnimationFrame(() => {
      const roles = document.getElementById('roles');
      roles?.scrollIntoView();
      roles?.focus({ preventScroll: true });
    });
  };
  if (error)
    return (
      <section className="state-panel auth-error-card" role="alert">
        <p className="eyebrow">{t('auth.recovery.eyebrow')}</p>
        <h1>{t('auth.failed')}</h1>
        <p>{t(`auth.errors.${error}`, { defaultValue: t('auth.errors.generic') })}</p>
        {requestId && (
          <p className="auth-reference">{t('auth.recovery.reference', { requestId })}</p>
        )}
        {errorCode && <p className="menu-error">{t('auth.recovery.retryFailed')}</p>}
        <div className="auth-recovery-actions">
          <button type="button" onClick={backToRoles}>
            <ArrowLeft aria-hidden="true" size={17} />
            {t('auth.recovery.back')}
          </button>
          {retryRole && (
            <button
              className="primary-action"
              type="button"
              disabled={status !== 'anonymous' || retryPending}
              aria-busy={retryPending}
              onClick={() => void startSignIn(retryRole)}
            >
              {retryPending ? (
                <LoaderCircle className="spin" aria-hidden="true" size={17} />
              ) : (
                <RefreshCw aria-hidden="true" size={17} />
              )}
              {t(retryPending ? 'auth.starting' : 'auth.recovery.tryAnother')}
            </button>
          )}
          <Link to="/how-to-login">{t('auth.recovery.loginHelp')}</Link>
        </div>
      </section>
    );
  if (status === 'loading')
    return (
      <section className="state-panel" aria-live="polite">
        <h1>{t('auth.finishing')}</h1>
      </section>
    );
  if (!user) return <Navigate to="/" replace />;
  if (user.roles.includes('ADMIN'))
    return (
      <section className="state-panel">
        <h1>{t('auth.welcome', { name: user.displayName })}</h1>
        <p>{t('auth.adminReady')}</p>
      </section>
    );
  return (
    <section className="state-panel pending-status-card">
      <p className="eyebrow">{t('auth.identityVerified')}</p>
      <h1>{t('auth.welcome', { name: user.displayName })}</h1>
      <p>{t(user.requestedRole === 'CAPTAIN' ? 'auth.captainPending' : 'auth.studentPending')}</p>
      {user.requestedRole === 'CAPTAIN' && <p>{t('auth.phase3Unavailable')}</p>}
    </section>
  );
}
