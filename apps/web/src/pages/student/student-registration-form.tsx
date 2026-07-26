import type { StudentRegistrationOption } from '@auto-present/shared';
import axios from 'axios';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api';

interface StudentRegistrationFormProps {
  onRegistered(): void;
}

function errorCode(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'generic';
  const code = (error.response?.data as { error?: { code?: unknown } } | undefined)?.error?.code;
  return typeof code === 'string' ? code : 'generic';
}

const selectClasses =
  'w-full px-3.5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-cyan-700 dark:focus:border-cyan-500 focus:ring-2 focus:ring-cyan-700/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors appearance-none';

export function StudentRegistrationForm({ onRegistered }: StudentRegistrationFormProps): ReactNode {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allOptions, setAllOptions] = useState<StudentRegistrationOption[] | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [selectedDepartmentKey, setSelectedDepartmentKey] = useState('');
  const [selectedSemesterKey, setSelectedSemesterKey] = useState('');
  const [selectedShiftKey, setSelectedShiftKey] = useState('');
  const [roll, setRoll] = useState('');
  const pending = useRef(false);

  const fetchOptions = (): void => {
    setLoadingOptions(true);
    setOptionsError(null);
    void apiClient
      .get<{ success: true; data: { options: StudentRegistrationOption[] } }>(
        '/student/registration-options',
      )
      .then((response) => {
        setAllOptions(response.data.data.options);
        setLoadingOptions(false);
      })
      .catch(() => {
        setOptionsError('generic');
        setLoadingOptions(false);
      });
  };

  useEffect(fetchOptions, []);

  const departments = useMemo(() => {
    if (!allOptions) return [];
    const seen = new Set<string>();
    return allOptions.filter((o) => {
      if (seen.has(o.departmentKey)) return false;
      seen.add(o.departmentKey);
      return true;
    });
  }, [allOptions]);

  const semesters = useMemo(() => {
    if (!allOptions || !selectedDepartmentKey) return [];
    const seen = new Set<string>();
    return allOptions
      .filter((o) => o.departmentKey === selectedDepartmentKey)
      .filter((o) => {
        if (seen.has(o.semesterKey)) return false;
        seen.add(o.semesterKey);
        return true;
      });
  }, [allOptions, selectedDepartmentKey]);

  const shifts = useMemo(() => {
    if (!allOptions || !selectedDepartmentKey || !selectedSemesterKey) return [];
    const seen = new Set<string>();
    return allOptions
      .filter(
        (o) => o.departmentKey === selectedDepartmentKey && o.semesterKey === selectedSemesterKey,
      )
      .filter((o) => {
        if (seen.has(o.shiftKey)) return false;
        seen.add(o.shiftKey);
        return true;
      });
  }, [allOptions, selectedDepartmentKey, selectedSemesterKey]);

  const handleDepartmentChange = (key: string): void => {
    setSelectedDepartmentKey(key);
    setSelectedSemesterKey('');
    setSelectedShiftKey('');
  };

  const handleSemesterChange = (key: string): void => {
    setSelectedSemesterKey(key);
    setSelectedShiftKey('');
  };

  const disabled = submitting || loadingOptions;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setError(null);
    const dept = departments.find((d) => d.departmentKey === selectedDepartmentKey);
    const sem = semesters.find((s) => s.semesterKey === selectedSemesterKey);
    const shf = shifts.find((s) => s.shiftKey === selectedShiftKey);
    try {
      await apiClient.post('/student/registration', {
        department: dept?.department ?? '',
        semester: sem?.semester ?? '',
        shift: shf?.shift ?? '',
        roll: roll.trim(),
      });
      onRegistered();
    } catch (caught) {
      setError(errorCode(caught));
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  if (loadingOptions)
    return (
      <div className="flex flex-col items-center gap-3 mt-6" aria-busy="true">
        <LoaderCircle className="size-8 animate-spin text-gray-400" aria-hidden="true" />
        <p className="text-gray-500 dark:text-gray-400">{t('student.loading')}</p>
      </div>
    );

  if (optionsError)
    return (
      <div className="flex flex-col items-center gap-3 mt-6">
        <p className="text-red-600 dark:text-red-400 text-sm" role="alert">
          {t('student.errors.generic')}
        </p>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition-colors cursor-pointer"
          type="button"
          onClick={fetchOptions}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {t('student.form.retry')}
        </button>
      </div>
    );

  if (allOptions && allOptions.length === 0)
    return (
      <div className="flex flex-col items-center gap-3 mt-6">
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('student.form.noOptions')}</p>
      </div>
    );

  return (
    <form className="grid gap-4 mt-6 text-left" onSubmit={(event) => void submit(event)}>
      {error && (
        <p className="text-red-600 dark:text-red-400 text-sm" role="alert">
          {t(`student.errors.${error}`, { defaultValue: t('student.errors.generic') })}
        </p>
      )}
      <label className="grid gap-1.5 font-semibold text-gray-900 dark:text-gray-100">
        {t('student.form.department')}
        <select
          value={selectedDepartmentKey}
          onChange={(e) => handleDepartmentChange(e.target.value)}
          required
          disabled={disabled}
          className={selectClasses}
        >
          <option value="">{t('student.form.selectDepartment')}</option>
          {departments.map((d) => (
            <option key={d.departmentKey} value={d.departmentKey}>
              {d.department}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 font-semibold text-gray-900 dark:text-gray-100">
        {t('student.form.semester')}
        <select
          value={selectedSemesterKey}
          onChange={(e) => handleSemesterChange(e.target.value)}
          required
          disabled={disabled || !selectedDepartmentKey}
          className={selectClasses}
        >
          <option value="">{t('student.form.selectSemester')}</option>
          {semesters.map((s) => (
            <option key={s.semesterKey} value={s.semesterKey}>
              {s.semester}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 font-semibold text-gray-900 dark:text-gray-100">
        {t('student.form.shift')}
        <select
          value={selectedShiftKey}
          onChange={(e) => setSelectedShiftKey(e.target.value)}
          required
          disabled={disabled || !selectedSemesterKey}
          className={selectClasses}
        >
          <option value="">{t('student.form.selectShift')}</option>
          {shifts.map((s) => (
            <option key={s.shiftKey} value={s.shiftKey}>
              {s.shift}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 font-semibold text-gray-900 dark:text-gray-100">
        {t('student.form.roll')}
        <input
          value={roll}
          onChange={(e) => setRoll(e.target.value)}
          type="text"
          required
          maxLength={64}
          disabled={disabled}
          className="w-full px-3.5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-cyan-700 dark:focus:border-cyan-500 focus:ring-2 focus:ring-cyan-700/20 focus:outline-none disabled:opacity-72 disabled:cursor-not-allowed transition-colors"
        />
      </label>
      <button
        className="w-full inline-flex items-center justify-center gap-2 min-h-[46px] px-4 py-3 rounded-xl font-bold text-white bg-cyan-700 dark:bg-cyan-600 hover:bg-cyan-600 dark:hover:bg-cyan-500 disabled:opacity-58 disabled:cursor-not-allowed transition-colors cursor-pointer"
        type="submit"
        disabled={disabled || !selectedShiftKey || !roll.trim()}
        aria-busy={submitting}
      >
        {submitting ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
        {t(submitting ? 'student.form.submitting' : 'student.form.submit')}
      </button>
    </form>
  );
}
