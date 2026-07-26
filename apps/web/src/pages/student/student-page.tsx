import type { StudentStatusResponse } from '@auto-present/shared';
import axios from 'axios';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { StudentRegistrationForm } from './student-registration-form';
import { StudentDashboard } from './student-dashboard';

function errorCode(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'generic';
  const code = (error.response?.data as { error?: { code?: unknown } } | undefined)?.error?.code;
  return typeof code === 'string' ? code : 'generic';
}

export function StudentPage(): ReactNode {
  const { t } = useTranslation();
  const { status: authStatus, user, isSwitchingRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [identityStatus, setIdentityStatus] = useState<StudentStatusResponse['identity'] | null>(
    null,
  );

  const [fetchTrigger, setFetchTrigger] = useState(0);

  useEffect(() => {
    if (authStatus !== 'authenticated' || isSwitchingRole || user?.requestedRole !== 'STUDENT') {
      setLoading(false);
      return;
    }

    let active = true;
    void apiClient
      .get<{ success: true; data: StudentStatusResponse }>('/student/status')
      .then((response) => {
        if (!active) return;
        setIdentityStatus(response.data.data.identity);
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
  }, [authStatus, user?.requestedRole, fetchTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegistered = (): void => {
    setLoading(true);
    setError(null);
    setFetchTrigger((c) => c + 1);
  };

  if (authStatus === 'loading' || isSwitchingRole || loading)
    return (
      <section className="max-w-xl mx-auto px-4 py-16">
        <div className="flex flex-col items-center gap-3" aria-busy="true">
          <LoaderCircle className="size-8 animate-spin text-gray-400" aria-hidden="true" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t('student.loading')}
          </h1>
        </div>
      </section>
    );

  if (!user) return <Navigate to="/" replace />;
  if (user.requestedRole !== 'STUDENT') return <Navigate to="/captain/setup" replace />;

  if (identityStatus?.status === 'CONFIRMED') return <StudentDashboard />;

  return (
    <section className="max-w-xl mx-auto px-4 py-12">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">
          {t('student.eyebrow')}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('student.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          {t('student.description')}
        </p>
        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-4" role="alert">
            {t(`student.errors.${error}`, { defaultValue: t('student.errors.generic') })}
          </p>
        )}
        <StudentRegistrationForm onRegistered={handleRegistered} />
      </div>
    </section>
  );
}
