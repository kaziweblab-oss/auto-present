import type { ReactNode } from 'react';

export function SectionLabel({ children }: { children: ReactNode }): ReactNode {
  return <p className="section-label">{children}</p>;
}
