import { Download, Laptop, MonitorSmartphone, Smartphone } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const releases = [
  { name: 'Progressive Web App', icon: MonitorSmartphone },
  { name: 'Android', icon: Smartphone },
  { name: 'Windows & Linux', icon: Laptop },
];

export function DownloadsPage(): ReactNode {
  const { t } = useTranslation();
  return (
    <section className="content-page">
      <p className="eyebrow">
        <Download size={16} />
        Release channels
      </p>
      <h1>{t('downloads.title')}</h1>
      <p>{t('downloads.description')}</p>
      <div className="download-grid">
        {releases.map(({ name, icon: Icon }) => (
          <article key={name}>
            <Icon aria-hidden="true" />
            <h2>{name}</h2>
            <span>{t('downloads.unavailable')}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
