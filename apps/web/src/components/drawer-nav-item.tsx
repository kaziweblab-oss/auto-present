import { ChevronRight } from 'lucide-react';
import { Link, type LinkProps } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

interface DrawerNavItemProps extends LinkProps {
  icon: ReactNode;
  danger?: boolean;
}

interface DrawerPreviewItemProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

export function DrawerNavItem({
  icon,
  danger,
  children,
  ...linkProps
}: DrawerNavItemProps): ReactNode {
  return (
    <Link className={`drawer-nav-item${danger ? ' danger' : ''}`} role="menuitem" {...linkProps}>
      {icon}
      <span>{children}</span>
      <ChevronRight className="nav-chevron" aria-hidden="true" />
    </Link>
  );
}

export function DrawerPreviewItem({ icon, label, onClick }: DrawerPreviewItemProps): ReactNode {
  const { t } = useTranslation();
  return (
    <button className="drawer-preview-item" type="button" onClick={onClick} role="menuitem">
      {icon}
      <span>{label}</span>
      <span className="coming-soon-badge">{t('menu.comingSoon')}</span>
    </button>
  );
}
