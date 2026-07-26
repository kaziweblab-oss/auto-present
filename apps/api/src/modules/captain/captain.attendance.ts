import { AppError } from '../../errors/app-error.js';
import { normalizeRoll, type SheetSnapshot } from './captain.parser.js';

const SUMMARY_HEADERS = new Set([
  'total',
  'present',
  'absent',
  'percentage',
  'attendance percentage',
  'remarks',
  'summary',
]);

export interface StoredSubjectStructure {
  subjectCode: string;
  subjectName: string;
  sheetId: number;
  tabTitle: string;
  headerRow: number;
  rollColumn: number;
  presentMarker: string;
  absentMarker: string;
  dateFormat: string;
}

export interface AttendanceWritePlan {
  date: string;
  displayDate: string;
  sheetId: number;
  tabTitle: string;
  headerRow: number;
  attendanceColumn: number;
  cells: Array<{ row: number; value: string }>;
  total: number;
  present: number;
  absent: number;
}

export interface SubjectRoster {
  subjectCode: string;
  rolls: string[];
}

function containsCell(
  range: {
    startRowIndex?: number;
    endRowIndex?: number;
    startColumnIndex?: number;
    endColumnIndex?: number;
  },
  row: number,
  column: number,
): boolean {
  return (
    row >= (range.startRowIndex ?? 0) &&
    row < (range.endRowIndex ?? Number.POSITIVE_INFINITY) &&
    column >= (range.startColumnIndex ?? 0) &&
    column < (range.endColumnIndex ?? Number.POSITIVE_INFINITY)
  );
}

function cell(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).normalize('NFKC').trim()
    : '';
}

function header(value: unknown): string {
  return cell(value).toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
}

export function parseIsoCalendarDate(value: string, today = new Date()): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new AppError(400, 'ATTENDANCE_DATE_INVALID', 'Enter a valid calendar date');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  )
    throw new AppError(400, 'ATTENDANCE_DATE_INVALID', 'Enter a valid calendar date');
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  if (value > todayKey)
    throw new AppError(400, 'ATTENDANCE_DATE_FUTURE', 'Future attendance is not allowed');
  return value;
}

export function normalizeSheetDate(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000);
    return date.toISOString().slice(0, 10);
  }
  const text = cell(value);
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) {
    try {
      return parseIsoCalendarDate(text, new Date(9999, 0, 1));
    } catch {
      return null;
    }
  }
  match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (!match) return null;
  const iso = `${match[3]}-${match[2]!.padStart(2, '0')}-${match[1]!.padStart(2, '0')}`;
  try {
    return parseIsoCalendarDate(iso, new Date(9999, 0, 1));
  } catch {
    return null;
  }
}

function displayDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function extractSubjectRoster(
  snapshot: SheetSnapshot,
  subject: StoredSubjectStructure,
): SubjectRoster {
  const tab = snapshot.sheets.find((sheet) => sheet.sheetId === subject.sheetId);

  if (!tab || tab.title !== subject.tabTitle || tab.hidden) {
    throw new AppError(
      409,
      'REGISTRATION_STRUCTURE_CHANGED',
      'The verified Sheet structure changed; verify it again',
    );
  }

  const headerValues = tab.values[subject.headerRow];

  if (!headerValues) {
    throw new AppError(
      409,
      'REGISTRATION_STRUCTURE_CHANGED',
      'The verified Sheet structure changed; verify it again',
    );
  }

  const detectedRollHeader = header(headerValues[subject.rollColumn]);

  if (!detectedRollHeader.includes('roll')) {
    throw new AppError(
      409,
      'REGISTRATION_STRUCTURE_CHANGED',
      'The verified Sheet structure changed; verify it again',
    );
  }

  const rolls = new Set<string>();

  for (let row = subject.headerRow + 1; row < tab.values.length; row += 1) {
    const original = cell(tab.values[row]?.[subject.rollColumn]);

    if (!original) continue;

    const normalized = normalizeRoll(original);

    if (!normalized) continue;

    if (rolls.has(normalized)) {
      throw new AppError(
        422,
        'ROSTER_ROLL_DUPLICATE',
        'The selected roster contains a duplicate roll',
      );
    }

    rolls.add(normalized);
  }

  return {
    subjectCode: subject.subjectCode,
    rolls: [...rolls],
  };
}

export function planAttendanceWrite(
  snapshot: SheetSnapshot,
  subject: StoredSubjectStructure,
  dateInput: string,
  presentRollInputs: string[],
  today?: Date,
): AttendanceWritePlan {
  const date = parseIsoCalendarDate(dateInput, today);
  const tab = snapshot.sheets.find((sheet) => sheet.sheetId === subject.sheetId);
  if (!tab || tab.title !== subject.tabTitle || tab.hidden)
    throw new AppError(
      409,
      'REGISTRATION_STRUCTURE_CHANGED',
      'The verified Sheet structure changed; verify it again',
    );
  const values = tab.values;
  const headerValues = values[subject.headerRow];
  if (!headerValues || header(headerValues[subject.rollColumn]) === '')
    throw new AppError(
      409,
      'REGISTRATION_STRUCTURE_CHANGED',
      'The verified Sheet structure changed; verify it again',
    );
  const detectedRollHeader = header(headerValues[subject.rollColumn]);
  if (!detectedRollHeader.includes('roll'))
    throw new AppError(
      409,
      'REGISTRATION_STRUCTURE_CHANGED',
      'The verified Sheet structure changed; verify it again',
    );

  const identityColumns = headerValues
    .map(header)
    .map((value, index) =>
      [
        'roll',
        'roll no',
        'roll number',
        'class roll',
        'student roll',
        'name',
        'student name',
        'shift',
        's/n',
        'sn',
      ].includes(value)
        ? index
        : -1,
    )
    .filter((index) => index >= 0);
  const identityEnd = Math.max(subject.rollColumn, ...identityColumns);
  let summaryStart = headerValues.findIndex(
    (value, index) => index > identityEnd && SUMMARY_HEADERS.has(header(value)),
  );
  const formulaColumn = values.slice(subject.headerRow + 1).reduce<number>((found, row) => {
    if (found >= 0) return found;
    return row.findIndex((value, index) => index > identityEnd && cell(value).startsWith('='));
  }, -1);
  if (formulaColumn >= 0 && (summaryStart < 0 || formulaColumn < summaryStart))
    summaryStart = formulaColumn;
  const boundary = summaryStart >= 0 ? summaryStart : (tab.columnCount ?? headerValues.length);
  const dateColumns: number[] = [];
  for (let column = identityEnd + 1; column < boundary; column += 1) {
    if (normalizeSheetDate(headerValues[column])) dateColumns.push(column);
  }
  if (dateColumns.some((column) => normalizeSheetDate(headerValues[column]) === date))
    throw new AppError(
      409,
      'ATTENDANCE_DATE_ALREADY_EXISTS',
      'Attendance has already been submitted for this date.',
    );
  let attendanceColumn = -1;
  for (let column = identityEnd + 1; column < boundary; column += 1) {
    if (!cell(headerValues[column])) {
      const hasFormula = values
        .slice(subject.headerRow + 1)
        .some((row) => cell(row[column]).startsWith('='));
      if (!hasFormula) {
        attendanceColumn = column;
        break;
      }
    }
  }
  if (attendanceColumn < 0)
    throw new AppError(
      422,
      'ATTENDANCE_NO_SAFE_COLUMN',
      'No safe attendance column is available before summary data',
    );

  const roster = new Map<string, number>();
  for (let row = subject.headerRow + 1; row < values.length; row += 1) {
    const original = cell(values[row]?.[subject.rollColumn]);
    if (!original) continue;
    const normalized = normalizeRoll(original);
    if (roster.has(normalized))
      throw new AppError(
        422,
        'ROSTER_ROLL_DUPLICATE',
        'The selected roster contains a duplicate roll',
      );
    roster.set(normalized, row);
  }

  const present = new Set(presentRollInputs.map(normalizeRoll).filter(Boolean));
  for (const roll of present)
    if (!roster.has(roll))
      throw new AppError(
        400,
        'ATTENDANCE_ROLL_UNKNOWN',
        'A submitted roll is not in the selected subject roster',
      );
  const cells = [...roster].map(([roll, row]) => ({
    row,
    value: present.has(roll) ? subject.presentMarker : subject.absentMarker,
  }));
  const unsupportedRanges = [...(tab.merges ?? []), ...(tab.protectedRanges ?? [])];
  if (
    unsupportedRanges.some(
      (range) =>
        containsCell(range, subject.headerRow, attendanceColumn) ||
        cells.some((item) => containsCell(range, item.row, attendanceColumn)),
    )
  )
    throw new AppError(
      422,
      'ATTENDANCE_STRUCTURE_UNSUPPORTED',
      'The target attendance cells are merged or protected',
    );
  return {
    date,
    displayDate: displayDate(date),
    sheetId: subject.sheetId,
    tabTitle: subject.tabTitle,
    headerRow: subject.headerRow,
    attendanceColumn,
    cells,
    total: roster.size,
    present: present.size,
    absent: roster.size - present.size,
  };
}
