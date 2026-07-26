import type { ReactNode } from 'react';

type BadgeVariant = 'verified' | 'pending' | 'captain' | 'admin';

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
}

export function StatusBadge({ variant, label }: StatusBadgeProps): ReactNode {
  return <span className={`status-badge ${variant}`}>{label}</span>;
}
