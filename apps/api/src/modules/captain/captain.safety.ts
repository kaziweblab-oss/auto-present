/**
 * Resource-abuse caps, not Sheet structure assumptions. Exceeding them fails explicitly with
 * SHEET_TOO_LARGE; changing them does not require parser changes.
 */
export const CAPTAIN_SHEET_SAFETY_LIMITS = {
  maxTabs: 30,
  maxRowsPerTab: 2_000,
  maxColumnsPerTab: 300,
  maxCellsPerSpreadsheet: 1_000_000,
  googleRequestTimeoutMs: 8_000,
} as const;

export const DEFAULT_ATTENDANCE_CONVENTION = {
  presentMarker: 'P',
  absentMarker: 'A',
  dateFormat: 'DD/MM/YYYY',
} as const;

export function columnLabel(index: number): string {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

export function tabReadRange(title: string, rowCount: number, columnCount: number): string {
  const escapedTitle = title.replaceAll("'", "''");
  return `'${escapedTitle}'!A1:${columnLabel(Math.max(0, columnCount - 1))}${Math.max(1, rowCount)}`;
}
