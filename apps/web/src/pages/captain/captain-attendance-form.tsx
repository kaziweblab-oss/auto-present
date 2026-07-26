import type {
  CaptainAttendanceBatchSummary,
  CaptainSubject,
  CaptainValidRollsResponse,
} from '@auto-present/shared';
import { Check, CheckCircle2, CircleAlert, LoaderCircle, RotateCcw, X } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api';

const DATE_FUTURE_ERROR = 'ATTENDANCE_DATE_FUTURE';

interface CaptainAttendanceFormProps {
  subjects: CaptainSubject[];
}

type RollInputError =
  | 'subject_required'
  | 'rolls_loading'
  | 'roll_not_found'
  | 'roll_already_added'
  | 'numbers_only'
  | 'valid_rolls_failed';

function localToday(): string {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(today.getDate()).padStart(2, '0')}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function CaptainAttendanceForm({ subjects }: CaptainAttendanceFormProps): ReactNode {
  const { t } = useTranslation();

  const [selectedSubjectCodes, setSelectedSubjectCodes] = useState<string[]>([]);
  const [validRolls, setValidRolls] = useState<Set<string>>(new Set());
  const [presentRolls, setPresentRolls] = useState<string[]>([]);
  const [rollInput, setRollInput] = useState('');
  const [rollsLoading, setRollsLoading] = useState(false);
  const [rollInputError, setRollInputError] = useState<RollInputError | null>(null);
  const [rollErrorVersion, setRollErrorVersion] = useState(0);

  const [dateValue, setDateValue] = useState(localToday());
  const [dateError, setDateError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<CaptainAttendanceBatchSummary | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const pending = useRef(false);
  const latestSubmissionRequest = useRef(0);
  const validRollRequest = useRef(0);
  const idempotencyKey = useRef(crypto.randomUUID());

  const allSelected = subjects.length > 0 && selectedSubjectCodes.length === subjects.length;

  const dateErrorText = dateValue > localToday() ? t(`captain.errors.${DATE_FUTURE_ERROR}`) : null;

  useEffect(() => {
    setDateError(dateErrorText);
  }, [dateErrorText]);

  const rollInputDisabled =
    submitting || rollsLoading || selectedSubjectCodes.length === 0 || validRolls.size === 0;

  const showRollInputError = (nextError: RollInputError): void => {
    setRollInputError(nextError);
    setRollErrorVersion((current) => current + 1);
  };

  useEffect(() => {
    if (!rollInputError) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRollInputError(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [rollInputError, rollErrorVersion]);

  useEffect(() => {
    if (selectedSubjectCodes.length === 0) {
      validRollRequest.current += 1;
      setValidRolls(new Set());
      setPresentRolls([]);
      setRollInput('');
      setRollsLoading(false);
      setRollInputError(null);
      return;
    }

    const requestNumber = validRollRequest.current + 1;
    validRollRequest.current = requestNumber;

    setRollsLoading(true);
    setRollInputError(null);

    const timeoutId = window.setTimeout(() => {
      void apiClient
        .post<{
          success: true;
          data: CaptainValidRollsResponse;
        }>('/captain/attendance/valid-rolls', {
          subjectCodes: selectedSubjectCodes,
        })
        .then((response) => {
          if (validRollRequest.current !== requestNumber) return;

          const nextValidRolls = new Set(response.data.data.validRolls);

          setValidRolls(nextValidRolls);
          setPresentRolls((current) => current.filter((roll) => nextValidRolls.has(roll)));
        })
        .catch(() => {
          if (validRollRequest.current !== requestNumber) return;

          setValidRolls(new Set());
          setPresentRolls([]);
          showRollInputError('valid_rolls_failed');
        })
        .finally(() => {
          if (validRollRequest.current === requestNumber) {
            setRollsLoading(false);
          }
        });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedSubjectCodes]);

  const toggleSubject = (subjectCode: string): void => {
    setSelectedSubjectCodes((current) =>
      current.includes(subjectCode)
        ? current.filter((code) => code !== subjectCode)
        : [...current, subjectCode],
    );
  };

  const selectAll = (): void => {
    setSelectedSubjectCodes(subjects.map((subject) => subject.subjectCode));
  };

  const clearAll = (): void => {
    setSelectedSubjectCodes([]);
  };

  const addRoll = (roll: string): boolean => {
    if (selectedSubjectCodes.length === 0) {
      showRollInputError('subject_required');
      return false;
    }

    if (rollsLoading) {
      showRollInputError('rolls_loading');
      return false;
    }

    if (!/^\d+$/.test(roll)) {
      showRollInputError('numbers_only');
      return false;
    }

    if (!validRolls.has(roll)) {
      showRollInputError('roll_not_found');
      return false;
    }

    if (presentRolls.includes(roll)) {
      showRollInputError('roll_already_added');
      return false;
    }

    setPresentRolls((current) => [...current, roll]);
    setRollInputError(null);

    return true;
  };

  const commitRollInput = (): void => {
    const roll = rollInput.trim();

    if (!roll) return;

    if (addRoll(roll)) {
      setRollInput('');
    }
  };

  const handleRollChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const rawValue = event.target.value;

    if (rawValue && !/^\d+$/.test(rawValue)) {
      showRollInputError('numbers_only');
    } else if (rollInputError) {
      setRollInputError(null);
    }

    setRollInput(rawValue.replace(/\D/g, ''));
  };

  const handleRollKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      commitRollInput();
    }
  };

  const removeRoll = (roll: string): void => {
    setPresentRolls((current) => current.filter((currentRoll) => currentRoll !== roll));
    setRollInputError(null);
  };

  const handleLockedRollArea = (): void => {
    if (selectedSubjectCodes.length === 0) {
      showRollInputError('subject_required');
      return;
    }

    if (rollsLoading) {
      showRollInputError('rolls_loading');
    }
  };

  const submitAttendance = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const formElement = event.currentTarget;

    if (pending.current || submitting || selectedSubjectCodes.length === 0 || rollsLoading) {
      return;
    }

    if (rollInput.trim()) {
      commitRollInput();
      return;
    }

    const requestId = latestSubmissionRequest.current + 1;
    latestSubmissionRequest.current = requestId;

    pending.current = true;
    setSubmitting(true);
    setSummary(null);
    setSubmitError(null);

    if (dateError) {
      pending.current = false;
      setSubmitting(false);
      return;
    }

    const form = new FormData(formElement);

    try {
      const response = await apiClient.post<{
        success: true;
        data: CaptainAttendanceBatchSummary;
      }>(
        '/captain/attendance/batch',
        {
          subjectCodes: selectedSubjectCodes,
          date: form.get('date'),
          presentRolls: unique(presentRolls),
          idempotencyKey: idempotencyKey.current,
        },
        {
          timeout: 60_000,
        },
      );

      if (latestSubmissionRequest.current !== requestId) return;

      const submissionSummary = response.data.data;

      setSummary(submissionSummary);
      setSubmitError(null);
      idempotencyKey.current = crypto.randomUUID();

      if (submissionSummary.status === 'WRITTEN') {
        setSelectedSubjectCodes([]);
        setPresentRolls([]);
        setRollInput('');
        formElement.reset();
      }
    } catch {
      if (latestSubmissionRequest.current !== requestId) return;

      setSummary(null);
      setSubmitError(
        t('captain.attendance.submitRequestFailed', {
          defaultValue:
            'The attendance request did not complete. Check the Google Sheet before submitting again.',
        }),
      );
    } finally {
      if (latestSubmissionRequest.current === requestId) {
        pending.current = false;
        setSubmitting(false);
      }
    }
  };

  const translateAttendanceResultMessage = (
    errorCode: string | undefined,
    fallbackMessage?: string,
  ): string => {
    if (errorCode) {
      const translated = t(`captain.errors.${errorCode}`, { defaultValue: '' });
      if (translated) return translated;
    }

    return fallbackMessage ?? t('captain.errors.generic');
  };

  const attendanceErrorMessage = (summaryData: CaptainAttendanceBatchSummary): string | null => {
    const duplicateResults = summaryData.results.filter(
      (result) => result.errorCode === 'ATTENDANCE_DATE_ALREADY_EXISTS',
    );
    const nonDuplicateFailures = summaryData.results.filter(
      (result) =>
        result.status === 'FAILED' && result.errorCode !== 'ATTENDANCE_DATE_ALREADY_EXISTS',
    );

    if (summaryData.status === 'WRITTEN') {
      return null;
    }

    if (summaryData.status === 'PARTIAL') {
      return t('captain.attendance.partial', {
        defaultValue:
          'Attendance was submitted for {{writtenSubjects}} of {{requestedSubjects}} subjects. Review the failed subjects below.',
        writtenSubjects: summaryData.writtenSubjects,
        requestedSubjects: summaryData.requestedSubjects,
      });
    }

    if (summaryData.status === 'FAILED' && summaryData.results.length > 0) {
      if (duplicateResults.length === summaryData.results.length) {
        return t('captain.attendance.allDuplicate', {
          defaultValue:
            'Attendance for this date has already been submitted for all selected subjects.',
        });
      }

      if (duplicateResults.length > 0 && nonDuplicateFailures.length > 0) {
        return t('captain.attendance.mixedDuplicate', {
          defaultValue:
            'Attendance was already submitted for some subjects. Review the subject results below.',
        });
      }

      if (nonDuplicateFailures.some((result) => result.errorCode === 'ATTENDANCE_ROLL_UNKNOWN')) {
        return t('captain.attendance.invalidRolls', {
          defaultValue: 'One or more roll numbers are not valid for the selected subjects.',
        });
      }

      if (nonDuplicateFailures.some((result) => result.errorCode === DATE_FUTURE_ERROR)) {
        return translateAttendanceResultMessage(DATE_FUTURE_ERROR, t('captain.errors.generic'));
      }

      if (
        nonDuplicateFailures.some((result) => result.errorCode === 'REGISTRATION_STRUCTURE_CHANGED')
      ) {
        return t('captain.attendance.structureChanged', {
          defaultValue:
            'The Google Sheet structure has changed. Verify the Captain registration again before submitting attendance.',
        });
      }

      if (
        nonDuplicateFailures.some((result) => result.errorCode === 'WORKSPACE_RECONNECT_REQUIRED')
      ) {
        return t('captain.attendance.workspaceReconnect', {
          defaultValue:
            'Google Workspace access has expired or been revoked. Reconnect Google Workspace to continue.',
        });
      }

      if (
        nonDuplicateFailures.some(
          (result) =>
            result.errorCode === 'ATTENDANCE_WRITE_FAILED' ||
            result.errorCode === 'ATTENDANCE_WRITE_UNVERIFIED',
        )
      ) {
        return t('captain.attendance.writeFailed', {
          defaultValue:
            'Attendance could not be written safely. Please check the Sheet connection and try again.',
        });
      }

      return t('captain.attendance.genericFailure', {
        defaultValue:
          'Attendance could not be submitted. Review the failed subjects and try again.',
      });
    }

    return null;
  };

  return (
    <form
      className="captain-form captain-attendance-form"
      onSubmit={(event) => void submitAttendance(event)}
    >
      <header className="captain-attendance-header">
        <div>
          <p className="eyebrow">
            {t('captain.attendance.eyebrow', {
              defaultValue: 'Attendance entry',
            })}
          </p>

          <h2>{t('captain.attendance.title')}</h2>

          <p>
            {t('captain.attendance.description', {
              defaultValue:
                'Choose one or more subjects, select a date, and enter the present student rolls.',
            })}
          </p>
        </div>

        <span className="captain-selected-count" aria-live="polite">
          {t('captain.attendance.selectedCount', {
            defaultValue: '{{selected}} of {{total}} selected',
            selected: selectedSubjectCodes.length,
            total: subjects.length,
          })}
        </span>
      </header>

      <fieldset className="captain-subject-selector">
        <div className="captain-subject-toolbar">
          <legend>{t('captain.attendance.subject')}</legend>

          <div className="captain-subject-actions">
            <button
              type="button"
              className="captain-subject-action"
              disabled={submitting || allSelected}
              onClick={selectAll}
            >
              <Check aria-hidden="true" />

              {t('captain.attendance.selectAll', {
                defaultValue: 'Select all',
              })}
            </button>

            <button
              type="button"
              className="captain-subject-action"
              disabled={submitting || selectedSubjectCodes.length === 0}
              onClick={clearAll}
            >
              <RotateCcw aria-hidden="true" />

              {t('captain.attendance.clearAll', {
                defaultValue: 'Clear',
              })}
            </button>
          </div>
        </div>

        <div className="captain-subject-options">
          {subjects.map((subject) => {
            const checked = selectedSubjectCodes.includes(subject.subjectCode);

            return (
              <label
                className="captain-subject-option"
                data-selected={checked}
                key={subject.subjectCode}
              >
                <input
                  className="captain-subject-checkbox"
                  type="checkbox"
                  name="subjectCodes"
                  value={subject.subjectCode}
                  checked={checked}
                  disabled={submitting}
                  onChange={() => toggleSubject(subject.subjectCode)}
                />

                <span className="captain-subject-check" aria-hidden="true">
                  {checked && <Check />}
                </span>

                <span className="captain-subject-content">
                  <strong>{subject.subjectName}</strong>
                  <small>{subject.subjectCode}</small>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="captain-attendance-fields">
        <label className="captain-date-field" data-invalid={Boolean(dateError)}>
          <span>{t('captain.attendance.date')}</span>

          <input
            name="date"
            type="date"
            required
            value={dateValue}
            max={localToday()}
            disabled={submitting}
            onChange={(e) => setDateValue(e.target.value)}
          />

          {dateError && (
            <p className="captain-field-error" role="alert">
              <CircleAlert aria-hidden="true" />
              {dateError}
            </p>
          )}
        </label>

        <div className="captain-roll-field">
          <span className="captain-roll-label">{t('captain.attendance.presentRolls')}</span>

          <div
            className="captain-roll-input-shell"
            data-disabled={rollInputDisabled}
            data-error={Boolean(rollInputError)}
            onClick={handleLockedRollArea}
          >
            {presentRolls.map((roll) => (
              <span className="captain-roll-chip" key={roll}>
                <span>{roll}</span>

                <button
                  type="button"
                  aria-label={t('captain.attendance.removeRoll', {
                    defaultValue: 'Remove roll {{roll}}',
                    roll,
                  })}
                  disabled={submitting}
                  onClick={() => removeRoll(roll)}
                >
                  <X aria-hidden="true" />
                </button>
              </span>
            ))}

            <input
              aria-label={t('captain.attendance.presentRolls')}
              name="presentRollInput"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={rollInput}
              placeholder={
                rollsLoading
                  ? t('captain.attendance.loadingRolls')
                  : selectedSubjectCodes.length === 0
                    ? t('captain.attendance.selectSubjectFirst')
                    : t('captain.attendance.rollHint')
              }
              disabled={rollInputDisabled}
              onChange={handleRollChange}
              onKeyDown={handleRollKeyDown}
            />

            {rollsLoading && (
              <LoaderCircle className="spin captain-roll-loader" aria-hidden="true" />
            )}
          </div>

          <small className="captain-roll-help">{t('captain.attendance.rollHelp')}</small>

          {rollInputError && (
            <p className="captain-roll-error" role="alert" aria-live="polite">
              <CircleAlert aria-hidden="true" />

              {t(`captain.attendance.rollErrors.${rollInputError}`)}
            </p>
          )}
        </div>
      </div>

      {selectedSubjectCodes.length === 0 && (
        <p className="captain-form-hint">
          <CircleAlert aria-hidden="true" />

          {t('captain.attendance.selectAtLeastOne', {
            defaultValue: 'Select at least one subject.',
          })}
        </p>
      )}

      {submitError && (
        <p className="captain-attendance-error" role="alert">
          <CircleAlert aria-hidden="true" />
          {submitError}
        </p>
      )}

      {summary && (
        <section
          className={`captain-attendance-result captain-attendance-result-${summary.status.toLowerCase()}`}
          role="status"
        >
          {summary.status !== 'WRITTEN' && (
            <p className="captain-attendance-error" role="alert">
              <CircleAlert aria-hidden="true" />
              {attendanceErrorMessage(summary)}
            </p>
          )}

          {summary.status === 'WRITTEN' && (
            <p className="captain-attendance-success">
              <CheckCircle2 aria-hidden="true" />
              {t('captain.attendance.successMessage', {
                defaultValue: 'Attendance was submitted successfully for all selected subjects.',
              })}
            </p>
          )}

          <header>
            {summary.status === 'WRITTEN' ? (
              <CheckCircle2 aria-hidden="true" />
            ) : (
              <CircleAlert aria-hidden="true" />
            )}

            <div>
              <strong>
                {t('captain.attendance.batchSummary', {
                  defaultValue:
                    '{{written}} of {{requested}} subjects completed. {{failed}} failed.',
                  written: summary.writtenSubjects,
                  requested: summary.requestedSubjects,
                  failed: summary.failedSubjects,
                })}
              </strong>

              <small>{summary.date}</small>
            </div>
          </header>

          <ul>
            {summary.results.map((result) => (
              <li key={result.subject.subjectCode} data-status={result.status}>
                <div>
                  <strong>{result.subject.subjectName}</strong>
                  <small>{result.subject.subjectCode}</small>
                </div>

                {result.status === 'WRITTEN' ? (
                  <span>
                    {t('captain.attendance.success', {
                      present: result.present,
                      absent: result.absent,
                      total: result.total,
                    })}
                  </span>
                ) : (
                  <span>
                    {translateAttendanceResultMessage(result.errorCode, result.errorMessage)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        className="primary-action captain-attendance-submit"
        type="submit"
        disabled={submitting || rollsLoading || selectedSubjectCodes.length === 0}
        aria-busy={submitting}
      >
        {submitting && <LoaderCircle className="spin" aria-hidden="true" />}

        {t(submitting ? 'captain.attendance.submitting' : 'captain.attendance.submit')}

        {!submitting && selectedSubjectCodes.length > 0 && (
          <span>({selectedSubjectCodes.length})</span>
        )}
      </button>
    </form>
  );
}
