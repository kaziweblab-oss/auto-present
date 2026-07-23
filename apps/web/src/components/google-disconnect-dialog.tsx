import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface GoogleDisconnectDialogProps {
  busy: boolean;
  errorCode: string | null;
  onCancel(): void;
  onConfirm(): void;
}

export function GoogleDisconnectDialog({
  busy,
  errorCode,
  onCancel,
  onConfirm,
}: GoogleDisconnectDialogProps): ReactNode {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? []),
    ];
    if (focusable.length === 0) return;
    const current = focusable.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey
      ? (current - 1 + focusable.length) % focusable.length
      : (current + 1) % focusable.length;
    event.preventDefault();
    focusable[next]?.focus();
  };

  return (
    <div className="dialog-backdrop">
      <div
        ref={dialogRef}
        className="disconnect-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="disconnect-title"
        aria-describedby="disconnect-description"
        aria-busy={busy}
        onKeyDown={onKeyDown}
      >
        <h2 id="disconnect-title">{t('disconnect.title')}</h2>
        <div id="disconnect-description">
          <p>{t('disconnect.identityAccess')}</p>
          <p>{t('disconnect.workspaceAccess')}</p>
          <p>{t('disconnect.allSessions')}</p>
          <p>{t('disconnect.permissionAgain')}</p>
          <p>{t('disconnect.googleAccountStaysSignedIn')}</p>
        </div>
        {errorCode && (
          <p className="menu-error" role="alert">
            {t(
              errorCode === 'GOOGLE_DISCONNECT_PARTIAL'
                ? 'disconnect.partial'
                : 'disconnect.identityUnavailable',
            )}{' '}
            {errorCode === 'GOOGLE_IDENTITY_REVOKE_UNAVAILABLE' && (
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
                {t('disconnect.permissionsLink')}
              </a>
            )}
          </p>
        )}
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" disabled={busy} onClick={onCancel}>
            {t('disconnect.cancel')}
          </button>
          <button
            className="danger-button"
            type="button"
            disabled={busy}
            aria-busy={busy}
            onClick={onConfirm}
          >
            {busy && <LoaderCircle className="spin" size={16} aria-hidden="true" />}
            {t(busy ? 'disconnect.disconnecting' : 'disconnect.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
