import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme, type Theme } from '@/providers/theme-provider';

const themeIcons: Record<Theme, LucideIcon> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};
const themeOptions: Theme[] = ['system', 'light', 'dark'];

function isTheme(value: string): value is Theme {
  return themeOptions.some((option) => option === value);
}

export function ThemeSelector(): ReactNode {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const CurrentIcon = themeIcons[theme];

  return (
    <Select.Root
      value={theme}
      onValueChange={(value) => {
        if (isTheme(value)) setTheme(value);
      }}
    >
      <Select.Trigger className="theme-trigger" aria-label={t('theme.label')}>
        <CurrentIcon className="theme-current-icon" size={17} aria-hidden="true" />
        <Select.Value className="theme-trigger-label">{t(`theme.${theme}`)}</Select.Value>
        <Select.Icon asChild>
          <ChevronDown className="theme-chevron" size={15} aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="theme-content"
          position="popper"
          sideOffset={7}
          align="end"
          collisionPadding={8}
        >
          <Select.Viewport className="theme-viewport">
            {themeOptions.map((value) => {
              const Icon = themeIcons[value];
              return (
                <Select.Item className="theme-option" key={value} value={value}>
                  <Icon size={16} aria-hidden="true" />
                  <Select.ItemText>{t(`theme.${value}`)}</Select.ItemText>
                  <Select.ItemIndicator className="theme-check">
                    <Check size={15} aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              );
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
