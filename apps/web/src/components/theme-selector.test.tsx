import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@/i18n';
import { ThemeProvider } from '@/providers/theme-provider';
import { ThemeSelector } from './theme-selector';
import { getStorageKey } from '@/lib/storage';

describe('ThemeSelector regression', () => {
  it('continues to persist a custom theme selection', async () => {
    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('combobox', { name: 'Theme' }));
    const dark = await screen.findByRole('option', { name: 'Dark' });
    fireEvent.click(dark);
    await waitFor(() => expect(localStorage.getItem(getStorageKey('theme'))).toBe('dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
