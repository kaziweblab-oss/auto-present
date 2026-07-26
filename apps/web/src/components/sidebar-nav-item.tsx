import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarNavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
}

export function SidebarNavItem({ to, icon, label }: SidebarNavItemProps): ReactNode {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
