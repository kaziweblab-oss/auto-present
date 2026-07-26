import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { decryptGoogleToken } from '../auth/auth.crypto.js';
import type { SheetSnapshot } from './captain.parser.js';
import { CAPTAIN_SHEET_SAFETY_LIMITS, columnLabel, tabReadRange } from './captain.safety.js';
import type { AttendanceWritePlan } from './captain.attendance.js';

const API_ORIGIN = 'https://sheets.googleapis.com';

export interface CaptainGoogleCredential {
  status: string;
  ciphertext?: string;
  iv?: string;
  authTag?: string;
  keyVersion?: string;
  scopes?: string[];
}

export interface CaptainSheetReader {
  validateConnection(credential: CaptainGoogleCredential): Promise<void>;
  readSpreadsheet(
    spreadsheetId: string,
    credential: CaptainGoogleCredential,
  ): Promise<SheetSnapshot>;
  writeAttendance?(
    spreadsheetId: string,
    plan: AttendanceWritePlan,
    credential: CaptainGoogleCredential,
  ): Promise<void>;
}

interface MetadataResponse {
  properties?: { title?: string; timeZone?: string };
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
      hidden?: boolean;
      gridProperties?: { rowCount?: number; columnCount?: number };
    };
    merges?: GridRange[];
    protectedRanges?: Array<{ range?: GridRange }>;
  }>;
}

interface GridRange {
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
}

interface ValuesResponse {
  valueRanges?: Array<{ values?: unknown[][] }>;
}

export class GoogleCaptainSheetReader implements CaptainSheetReader {
  private async accessToken(credential: CaptainGoogleCredential): Promise<string> {
    if (credential.status !== 'CONNECTED')
      throw new AppError(
        409,
        'WORKSPACE_RECONNECT_REQUIRED',
        'Reconnect Google Workspace to continue',
      );
    if (!credential.ciphertext || !credential.iv || !credential.authTag || !credential.keyVersion)
      throw new AppError(
        409,
        'WORKSPACE_CONNECTION_REQUIRED',
        'Connect Google Workspace to continue',
      );
    const refreshToken = decryptGoogleToken({
      ciphertext: credential.ciphertext,
      iv: credential.iv,
      authTag: credential.authTag,
      keyVersion: credential.keyVersion,
    });
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
    client.setCredentials({ refresh_token: refreshToken });
    try {
      const token = await client.getAccessToken();
      if (!token.token) throw new Error('missing token');
      return token.token;
    } catch {
      throw new AppError(
        409,
        'WORKSPACE_RECONNECT_REQUIRED',
        'Reconnect Google Workspace to continue',
      );
    }
  }

  async validateConnection(credential: CaptainGoogleCredential): Promise<void> {
    await this.accessToken(credential);
  }

  async writeAttendance(
    spreadsheetId: string,
    plan: AttendanceWritePlan,
    credential: CaptainGoogleCredential,
  ): Promise<void> {
    const accessToken = await this.accessToken(credential);
    const url = new URL(
      `/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
      API_ORIGIN,
    );
    const escapedTitle = plan.tabTitle.replaceAll("'", "''");
    const data = [
      {
        range: `'${escapedTitle}'!${columnLabel(plan.attendanceColumn)}${plan.headerRow + 1}`,
        majorDimension: 'ROWS',
        values: [[plan.displayDate]],
      },
      ...plan.cells.map((item) => ({
        range: `'${escapedTitle}'!${columnLabel(plan.attendanceColumn)}${item.row + 1}`,
        majorDimension: 'ROWS',
        values: [[item.value]],
      })),
    ];
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }),
        signal: AbortSignal.timeout(CAPTAIN_SHEET_SAFETY_LIMITS.googleRequestTimeoutMs),
      });
    } catch {
      throw new AppError(503, 'ATTENDANCE_WRITE_FAILED', 'Attendance could not be written safely');
    }
    if (!response.ok)
      throw new AppError(
        response.status === 401 || response.status === 403 ? 409 : 503,
        response.status === 401 || response.status === 403
          ? 'WORKSPACE_RECONNECT_REQUIRED'
          : 'ATTENDANCE_WRITE_FAILED',
        response.status === 401 || response.status === 403
          ? 'Reconnect Google Workspace to continue'
          : 'Attendance could not be written safely',
      );
  }

  private async get<T>(url: URL, accessToken: string): Promise<T> {
    let lastStatus = 0;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(CAPTAIN_SHEET_SAFETY_LIMITS.googleRequestTimeoutMs),
        });
        lastStatus = response.status;
        if (response.ok) return (await response.json()) as T;
        if (response.status === 401 || response.status === 403)
          throw new AppError(
            409,
            'WORKSPACE_RECONNECT_REQUIRED',
            'Google Workspace authorization is missing or insufficient',
          );
        if (response.status < 500 || attempt === 1) break;
      } catch (error) {
        if (error instanceof AppError) throw error;
        if (attempt === 1)
          throw new AppError(
            503,
            'SHEET_READ_UNAVAILABLE',
            'The spreadsheet could not be read safely',
          );
      }
    }
    throw new AppError(
      lastStatus === 404 ? 404 : 503,
      lastStatus === 404 ? 'SHEET_NOT_FOUND' : 'SHEET_READ_UNAVAILABLE',
      lastStatus === 404
        ? 'The spreadsheet was not found or is not shared with this account'
        : 'The spreadsheet could not be read safely',
    );
  }

  async readSpreadsheet(
    spreadsheetId: string,
    credential: CaptainGoogleCredential,
  ): Promise<SheetSnapshot> {
    const accessToken = await this.accessToken(credential);
    const metadataUrl = new URL(
      `/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`,
      API_ORIGIN,
    );
    metadataUrl.searchParams.set(
      'fields',
      'properties(title,timeZone),sheets(properties(sheetId,title,hidden,gridProperties(rowCount,columnCount)),merges,protectedRanges.range)',
    );
    const metadata = await this.get<MetadataResponse>(metadataUrl, accessToken);
    const sheets = (metadata.sheets ?? [])
      .map((sheet) => ({
        sheetId: sheet.properties?.sheetId ?? -1,
        title: sheet.properties?.title?.trim() ?? '',
        hidden: sheet.properties?.hidden === true,
        rowCount: sheet.properties?.gridProperties?.rowCount ?? 0,
        columnCount: sheet.properties?.gridProperties?.columnCount ?? 0,
        merges: sheet.merges ?? [],
        protectedRanges: (sheet.protectedRanges ?? [])
          .map((item) => item.range)
          .filter((range): range is GridRange => Boolean(range)),
      }))
      .filter((sheet) => sheet.title && sheet.sheetId >= 0);
    if (
      sheets.length > CAPTAIN_SHEET_SAFETY_LIMITS.maxTabs ||
      sheets.some(
        (sheet) =>
          sheet.rowCount > CAPTAIN_SHEET_SAFETY_LIMITS.maxRowsPerTab ||
          sheet.columnCount > CAPTAIN_SHEET_SAFETY_LIMITS.maxColumnsPerTab,
      ) ||
      sheets.reduce((total, sheet) => total + sheet.rowCount * sheet.columnCount, 0) >
        CAPTAIN_SHEET_SAFETY_LIMITS.maxCellsPerSpreadsheet
    )
      throw new AppError(
        422,
        'SHEET_TOO_LARGE',
        'The spreadsheet exceeds the configured safe read limits',
      );
    const visible = sheets.filter((sheet) => !sheet.hidden);
    const valuesUrl = new URL(
      `/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchGet`,
      API_ORIGIN,
    );
    for (const sheet of visible)
      valuesUrl.searchParams.append(
        'ranges',
        tabReadRange(sheet.title, sheet.rowCount, sheet.columnCount),
      );
    valuesUrl.searchParams.set('majorDimension', 'ROWS');
    valuesUrl.searchParams.set('valueRenderOption', 'FORMATTED_VALUE');
    const values = visible.length
      ? await this.get<ValuesResponse>(valuesUrl, accessToken)
      : { valueRanges: [] };
    let visibleIndex = 0;
    return {
      spreadsheetId,
      title: metadata.properties?.title?.trim() || 'Google Sheet',
      timeZone: metadata.properties?.timeZone ?? 'UTC',
      sheets: sheets.map((sheet) => ({
        ...sheet,
        values: sheet.hidden ? [] : (values.valueRanges?.[visibleIndex++]?.values ?? []),
      })),
    };
  }
}
