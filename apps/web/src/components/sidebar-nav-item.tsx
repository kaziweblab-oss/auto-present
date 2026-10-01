import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarNavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
}

export function SidebarNavItem({ to, icon, label, active }: SidebarNavItemProps): ReactNode {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `sidebar-nav-item${(active ?? isActive) ? ' active' : ''}`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
