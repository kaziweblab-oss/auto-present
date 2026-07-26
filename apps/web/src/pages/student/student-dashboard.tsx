import type { StudentDashboardResponse } from '@auto-present/shared';
import axios from 'axios';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api';

function errorCode(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'generic';
  const code = (error.response?.data as { error?: { code?: unknown } } | undefined)?.error?.code;
  return typeof code === 'string' ? code : 'generic';
}

export function StudentDashboard(): ReactNode {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null);

  const [fetchTrigger, setFetchTrigger] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void apiClient
      .get<{ success: true; data: StudentDashboardResponse }>('/student/dashboard')
      .then((response) => {
        if (!active) return;
        setDashboard(response.data.data);
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
  }, [fetchTrigger]);

  if (loading)
    return (
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-3 py-16" aria-busy="true">
          <LoaderCircle className="size-8 animate-spin text-gray-400" aria-hidden="true" />
          <p className="text-gray-500 dark:text-gray-400">{t('student.dashboard.loading')}</p>
        </div>
      </section>
    );

  if (error)
    return (
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-3 py-16" role="alert">
          <p className="text-red-600 dark:text-red-400">{t('student.dashboard.error')}</p>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            type="button"
            onClick={() => setFetchTrigger((c) => c + 1)}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {t('student.dashboard.retry')}
          </button>
        </div>
      </section>
    );

  if (!dashboard) return null;

  const { student, subjects, attendanceSummaries } = dashboard;

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">
          {t('student.dashboard.identity')}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {student.displayName}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-0.5">{student.email}</p>
        <p className="mt-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('student.dashboard.rollLabel')}:
          </span>
          <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
            {student.roll}
          </span>
        </p>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('student.dashboard.subjects')}
        </h2>
        {subjects.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t('student.dashboard.noSubjects')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <span
                key={subject.subjectCode}
                className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-full text-sm font-medium"
              >
                <span>{subject.subjectName}</span>
                <span className="text-gray-400 dark:text-gray-500 text-xs">
                  {subject.subjectCode}
                </span>
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('student.dashboard.attendanceSummary')}
        </h2>
        {attendanceSummaries.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t('student.dashboard.noAttendance')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-medium">
                  <th className="px-4 py-3">{t('student.dashboard.subjectColumn')}</th>
                  <th className="px-4 py-3 text-center">{t('student.dashboard.totalClasses')}</th>
                  <th className="px-4 py-3 text-center">{t('student.dashboard.present')}</th>
                  <th className="px-4 py-3 text-center">{t('student.dashboard.absent')}</th>
                  <th className="px-4 py-3 text-center">{t('student.dashboard.percentage')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {attendanceSummaries.map((summary) => (
                  <tr
                    key={summary.subjectCode}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <td className="px-4 py-3 font-medium">
                      <span>{summary.subjectName}</span>
                      <span className="ml-1.5 text-gray-400 dark:text-gray-500 text-xs">
                        {summary.subjectCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                      {summary.totalClasses}
                    </td>
                    <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-medium">
                      {summary.presentClasses}
                    </td>
                    <td className="px-4 py-3 text-center text-red-600 dark:text-red-400 font-medium">
                      {summary.absentClasses}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      <span
                        className={
                          summary.attendancePercentage >= 75
                            ? 'text-green-600 dark:text-green-400'
                            : summary.attendancePercentage >= 60
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                        }
                      >
                        {summary.attendancePercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
