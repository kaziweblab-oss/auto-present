import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'src');

const KNOWN_FAKE_ID = '1abcdefghijklmnopqrstuvwxyzABCDE';

const CAPTAIN_RUNTIME_FILES = [
  'modules/captain/captain.service.ts',
  'modules/captain/captain.routes.ts',
  'modules/captain/captain.parser.ts',
  'modules/captain/captain.repository.ts',
  'modules/captain/captain.attendance.ts',
  'modules/captain/captain.lock.ts',
  'modules/captain/captain.google.ts',
  'modules/captain/captain.models.ts',
  'modules/captain/captain.safety.ts',
  'modules/captain/captain-roll-matcher.ts',
];

const ALL_RUNTIME_FILES = [
  'server.ts',
  'app.ts',
  'config/env.ts',
  'config/logger.ts',
  'config/version.ts',
  'database/mongodb.ts',
  'modules/health/health.service.ts',
  'modules/health/health.controller.ts',
  'modules/health/health.routes.ts',
  'modules/auth/auth.service.ts',
  'modules/auth/auth.routes.ts',
  'modules/auth/auth.crypto.ts',
  'modules/auth/auth.middleware.ts',
  'modules/auth/auth.models.ts',
  'modules/auth/auth.repository.ts',
  'modules/student/student.service.ts',
  'modules/student/student.routes.ts',
  'modules/student/student.models.ts',
  'modules/student/student.repository.ts',
  ...CAPTAIN_RUNTIME_FILES,
];

describe('production-data isolation', () => {
  describe('runtime files do not import test files', () => {
    for (const file of ALL_RUNTIME_FILES) {
      it(`${file} does not import from test-* files`, () => {
        const content = readFileSync(join(SRC, file), 'utf-8');
        const importLines = content
          .split('\n')
          .filter(
            (line) =>
              (line.includes('from') || line.includes('require')) &&
              (line.includes('.test.') || line.includes('.spec.')),
          );
        expect(importLines).toHaveLength(0);
      });
    }
  });

  describe('runtime captain files do not contain fake spreadsheet IDs', () => {
    for (const file of CAPTAIN_RUNTIME_FILES) {
      it(`${file} does not contain the known fake spreadsheet ID`, () => {
        const content = readFileSync(join(SRC, file), 'utf-8');
        expect(content).not.toContain(KNOWN_FAKE_ID);
      });
    }
  });

  describe('runtime files do not contain hardcoded Google Sheets URLs with IDs', () => {
    for (const file of CAPTAIN_RUNTIME_FILES) {
      it(`${file} has no hardcoded spreadsheet URL with ID`, () => {
        const content = readFileSync(join(SRC, file), 'utf-8');
        const hardcodedSheetUrl = /https:\/\/docs\.google\.com\/spreadsheets\/d\/(?!\$\{|YOUR)/;
        expect(content).not.toMatch(hardcodedSheetUrl);
      });
    }
  });

  describe('canonicalSheetUrl produces safe URLs', () => {
    it('only constructs URLs from a validated spreadsheetId argument', async () => {
      const { canonicalSheetUrl } = await import('./modules/captain/captain.parser.js');
      const url = canonicalSheetUrl('test123');
      expect(url).toBe('https://docs.google.com/spreadsheets/d/test123');
    });
  });

  describe('extractSpreadsheetId validates input', () => {
    it('rejects non-Google Sheets URLs', async () => {
      const { extractSpreadsheetId } = await import('./modules/captain/captain.parser.js');
      expect(() => extractSpreadsheetId('https://evil.example.com')).toThrow(
        'Enter a valid Google Sheets URL',
      );
    });

    it('rejects URLs without HTTPS', async () => {
      const { extractSpreadsheetId } = await import('./modules/captain/captain.parser.js');
      expect(() => extractSpreadsheetId('http://docs.google.com/spreadsheets/d/abc')).toThrow(
        'Enter a valid Google Sheets URL',
      );
    });

    it('rejects invalid spreadsheet IDs', async () => {
      const { extractSpreadsheetId } = await import('./modules/captain/captain.parser.js');
      expect(() => extractSpreadsheetId('https://docs.google.com/spreadsheets/d/')).toThrow(
        'Enter a valid Google Sheets URL',
      );
    });
  });

  describe('no VITE_ env var contains sheet data', () => {
    it('VITE_API_BASE_URL is the only VITE_ network env var', () => {
      const webEnv = readFileSync(join(dirname(__dirname), '..', 'web', '.env.example'), 'utf-8');
      const viteLines = webEnv
        .split('\n')
        .filter((line) => line.startsWith('VITE_') && !line.startsWith('#'));
      for (const line of viteLines) {
        expect(line.toLowerCase()).not.toContain('sheet');
        expect(line.toLowerCase()).not.toContain('spreadsheet');
        expect(line.toLowerCase()).not.toContain('google');
      }
    });
  });
});
