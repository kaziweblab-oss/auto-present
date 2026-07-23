import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function RouteLoadingFallback(): ReactNode {
  const { t } = useTranslation();

  return (
    <div className="route-loading" role="status" aria-live="polite" aria-atomic="true">
      <span className="route-loading-spinner" aria-hidden="true" />
      <span>{t('common.loading')}</span>
    </div>
  );
}
