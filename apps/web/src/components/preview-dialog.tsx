import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface PreviewDialogProps {
  onClose(): void;
}

export function PreviewDialog({ onClose }: PreviewDialogProps): ReactNode {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
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
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        aria-describedby="preview-description"
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="preview-title">{t('menu.featurePreview')}</h2>
        <p id="preview-description">{t('menu.featurePreviewBody')}</p>
        <div className="dialog-actions">
          <button ref={closeRef} className="primary-action" type="button" onClick={onClose}>
            {t('menu.closePreview')}
          </button>
        </div>
      </div>
    </div>
  );
}
