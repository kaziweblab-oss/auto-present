import { describe, expect, it } from 'vitest';
import i18n from './i18n';

describe('i18next configuration', () => {
  it('disables only the official support notice and preserves both languages', () => {
    expect(i18n.options.showSupportNotice).toBe(false);
    expect(i18n.options.supportedLngs).toEqual(expect.arrayContaining(['en', 'bn']));
    expect(i18n.getResourceBundle('en', 'translation')).toBeTruthy();
    expect(i18n.getResourceBundle('bn', 'translation')).toBeTruthy();
  });
});
