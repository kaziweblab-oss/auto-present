import { CirclePlay, VideoOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function HowToLoginPage(): ReactNode {
  const { t } = useTranslation();
  const videoUrl = import.meta.env.VITE_LOGIN_HELP_VIDEO_URL?.trim();

  return (
    <section className="content-page">
      <p className="eyebrow">
        <CirclePlay size={16} />
        Guided access
      </p>
      <h1>{t('help.title')}</h1>
      <p>{t('help.description')}</p>
      {videoUrl ? (
        <div className="video-frame">
          <iframe src={videoUrl} title={t('help.title')} allowFullScreen />
        </div>
      ) : (
        <div className="empty-state" role="status">
          <VideoOff aria-hidden="true" />
          <strong>{t('help.unavailable')}</strong>
          <span>{t('welcome.futureAction')}</span>
        </div>
      )}
    </section>
  );
}
