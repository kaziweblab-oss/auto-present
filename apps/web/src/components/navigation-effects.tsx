import { useEffect, type ReactNode } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router-dom';

export function NavigationEffects(): ReactNode {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === NavigationType.Pop) return;

    const focusMain = (): void => {
      document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
    };

    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        target.scrollIntoView();
        focusMain();
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    focusMain();
  }, [hash, navigationType, pathname]);

  return null;
}
