import type {
  CaptainRegistrationView,
  CaptainStatusResponse,
  GoogleAuthStartResponse,
} from '@auto-present/shared';
import axios from 'axios';
import { CheckCircle2, LoaderCircle, RefreshCw, Sheet } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { CaptainAttendanceForm } from './captain-attendance-form';

function errorCode(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'generic';
  const code = (error.response?.data as { error?: { code?: unknown } } | undefined)?.error?.code;
  return typeof code === 'string' ? code : 'generic';
}

export function CaptainPage(): ReactNode {
  const { t } = useTranslation();
  const { status: authStatus, user, isSwitchingRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [workspacePending, setWorkspacePending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceStatus, setWorkspaceStatus] =
    useState<CaptainStatusResponse['workspaceStatus']>('NOT_CONNECTED');
  const [registration, setRegistration] = useState<CaptainRegistrationView | null>(null);
  const [editingRegistration, setEditingRegistration] = useState(false);
  const pending = useRef(false);

  useEffect(() => {
    if (authStatus !== 'authenticated' || isSwitchingRole || user?.requestedRole !== 'CAPTAIN') {
      setLoading(false);
      return;
    }

    let active = true;
    void apiClient
      .get<{ success: true; data: CaptainStatusResponse }>('/captain/status')
      .then((response) => {
        if (!active) return;
        setWorkspaceStatus(response.data.data.workspaceStatus);
        setRegistration(response.data.data.registration);
      })
      .catch((caught: unknown) => {
        if (active) setError(errorCode(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authStatus, user?.requestedRole]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!registration) return;

    const changingSheet = searchParams.get('changeSheet') === 'true';

    setEditingRegistration(changingSheet);

    if (changingSheet) {
      setError(null);
    }
  }, [registration, searchParams]);

  if (authStatus === 'loading' || isSwitchingRole || loading)
    return (
      <section className="state-panel" aria-busy="true">
        <LoaderCircle className="spin" aria-hidden="true" />
        <h1>{t('captain.loading')}</h1>
      </section>
    );
  if (!user) return <Navigate to="/" replace />;
  if (user.requestedRole !== 'CAPTAIN') return <Navigate to="/student" replace />;

  const connectWorkspace = async (): Promise<void> => {
    if (workspacePending) return;
    setWorkspacePending(true);
    setError(null);
    try {
      const response = await apiClient.post<{ success: true; data: GoogleAuthStartResponse }>(
        '/auth/google/workspace/start',
        { role: 'CAPTAIN', returnPath: '/captain/setup' },
      );
      window.location.assign(response.data.data.authorizationUrl);
    } catch (caught) {
      setError(errorCode(caught));
      setWorkspacePending(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await apiClient.post<{
        success: true;
        data: CaptainRegistrationView;
      }>('/captain/registration', {
        sheetUrl: form.get('sheetUrl'),
        captainRoll: form.get('captainRoll'),
      });
      setRegistration(response.data.data);
      setEditingRegistration(false);
      setSearchParams({}, { replace: true });
    } catch (caught) {
      setError(errorCode(caught));
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  if (workspaceStatus === 'CONNECTED' && registration && !editingRegistration)
    return (
      <section className="captain-panel">
        <div className="state-panel captain-dashboard">
          <CheckCircle2 aria-hidden="true" />
          <p className="eyebrow">{t('captain.dashboard.verified')}</p>
          <h1>{t('captain.dashboard.title', { name: user.displayName })}</h1>
          <dl className="captain-details">
            <div>
              <dt>{t('captain.department')}</dt>
              <dd>{registration.department}</dd>
            </div>
            <div>
              <dt>{t('captain.semester')}</dt>
              <dd>{registration.semester}</dd>
            </div>
            <div>
              <dt>{t('captain.shift')}</dt>
              <dd>{registration.shift}</dd>
            </div>
            <div>
              <dt>{t('captain.sheet')}</dt>
              <dd>{registration.spreadsheetTitle}</dd>
            </div>
          </dl>
          <div className="captain-registration-status">
            <span>{t('captain.dashboard.health')}</span>

            <strong>
              {t('captain.dashboard.subjectCount', {
                defaultValue: '{{count}} registered subjects',
                count: registration.subjects.length,
              })}
            </strong>
          </div>

          <CaptainAttendanceForm subjects={registration.subjects} />
        </div>
      </section>
    );

  return (
    <section className="captain-panel">
      <div className="state-panel">
        <p className="eyebrow">{t('captain.eyebrow')}</p>
        <h1>{t('captain.title')}</h1>
        <p>{t('captain.description')}</p>
        {error && (
          <p className="menu-error" role="alert">
            {t(`captain.errors.${error}`, { defaultValue: t('captain.errors.generic') })}
          </p>
        )}
        {workspaceStatus !== 'CONNECTED' ? (
          <button
            className="primary-action"
            type="button"
            disabled={workspacePending}
            aria-busy={workspacePending}
            onClick={() => void connectWorkspace()}
          >
            {workspacePending ? (
              <LoaderCircle className="spin" aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {t(
              workspacePending
                ? 'captain.workspaceConnecting'
                : workspaceStatus === 'RECONNECT_REQUIRED'
                  ? 'captain.workspaceReconnect'
                  : 'captain.workspaceConnect',
            )}
          </button>
        ) : (
          <form className="captain-form" onSubmit={(event) => void submit(event)}>
            <label>
              {t('captain.sheetUrl')}
              <input
                name="sheetUrl"
                type="url"
                required
                maxLength={500}
                placeholder="https://docs.google.com/spreadsheets/d/…"
              />
            </label>
            <label>
              {t('captain.roll')}
              <input name="captainRoll" type="text" required maxLength={64} inputMode="text" />
            </label>
            <button
              className="primary-action"
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? (
                <LoaderCircle className="spin" aria-hidden="true" />
              ) : (
                <Sheet aria-hidden="true" />
              )}
              {t(submitting ? 'captain.verifying' : 'captain.verify')}
            </button>

            {registration && editingRegistration && (
              <button
                className="secondary-action"
                type="button"
                disabled={submitting}
                onClick={() => {
                  setError(null);
                  setEditingRegistration(false);
                  setSearchParams({}, { replace: true });
                }}
              >
                Cancel
              </button>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
