import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme(theme: Theme): void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const updateRoot = (): void => {
    const resolvedTheme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    document.documentElement.style.colorScheme = resolvedTheme;
  };

  updateRoot();
  media.addEventListener('change', updateRoot);
  return () => media.removeEventListener('change', updateRoot);
}

export function ThemeProvider({ children }: { children: ReactNode }): ReactNode {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('auto-present-theme');
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  });

  useEffect(() => applyTheme(theme), [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme(nextTheme: Theme) {
        localStorage.setItem('auto-present-theme', nextTheme);
        setThemeState(nextTheme);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Theme state intentionally shares this module with its provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
