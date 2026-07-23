import type { ApiSuccessResponse, LiveHealthData } from '@auto-present/shared';
import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api';

async function fetchLiveHealth(): Promise<ApiSuccessResponse<LiveHealthData>> {
  const response = await apiClient.get<ApiSuccessResponse<LiveHealthData>>('/health/live');
  return response.data;
}

export function SystemStatus(): ReactNode {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['health', 'live'],
    queryFn: fetchLiveHealth,
    retry: 1,
    refetchInterval: 30_000,
  });
  const state = query.isPending ? 'checking' : query.isSuccess ? 'online' : 'offline';

  return (
    <section className="status-card" id="system-status" aria-live="polite">
      <span className={`status-icon status-${state}`}>
        <Activity aria-hidden="true" size={18} />
      </span>
      <span>
        <small>{t('status.title')}</small>
        <strong>{t(`status.${state}`)}</strong>
      </span>
    </section>
  );
}
