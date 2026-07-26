import { createHash } from 'node:crypto';
import type { CaptainSubject } from '@auto-present/shared';
import { AppError } from '../../errors/app-error.js';
import { CAPTAIN_SHEET_SAFETY_LIMITS, DEFAULT_ATTENDANCE_CONVENTION } from './captain.safety.js';
import { normalizeCell, normalizeRoll, matchRollInRows } from './captain-roll-matcher.js';

export const CAPTAIN_PARSER_VERSION = 'captain-sheet-v3';

const SHEET_ID = /^[a-zA-Z0-9_-]{20,200}$/;
const ROLL_ALIASES = new Set(['roll', 'roll no', 'roll number', 'class roll', 'student roll']);
const NAME_ALIASES = new Set(['name', 'student name', 'students name']);
const SHIFT_ALIASES = new Set(['shift']);

export interface SheetSnapshot {
  spreadsheetId: string;
  title: string;
  timeZone?: string;
  sheets: Array<{
    sheetId?: number;
    title: string;
    hidden: boolean;
    rowCount?: number;
    columnCount?: number;
    merges?: Array<{
      startRowIndex?: number;
      endRowIndex?: number;
      startColumnIndex?: number;
      endColumnIndex?: number;
    }>;
    protectedRanges?: Array<{
      startRowIndex?: number;
      endRowIndex?: number;
      startColumnIndex?: number;
      endColumnIndex?: number;
    }>;
    values: unknown[][];
  }>;
}

export interface ParsedCaptainSubject extends CaptainSubject {
  sheetId: number;
  tabTitle: string;
  headerRow: number;
  rollColumn: number;
  presentMarker: string;
  absentMarker: string;
  dateFormat: string;
}

export interface ParsedCaptainSheet {
  spreadsheetId: string;
  spreadsheetTitle: string;
  department: string;
  semester: string;
  shift: string;
  subjects: ParsedCaptainSubject[];
  warnings: string[];
  structureFingerprint: string;
}

export function extractSpreadsheetId(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError(400, 'SHEET_URL_INVALID', 'Enter a valid Google Sheets URL');
  }
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'docs.google.com' ||
    url.username ||
    url.password
  )
    throw new AppError(400, 'SHEET_URL_INVALID', 'Enter a valid Google Sheets URL');
  const match = /^\/spreadsheets\/d\/([^/]+)(?:\/.*)?$/.exec(url.pathname);
  const id = match?.[1];
  if (!id || !SHEET_ID.test(id))
    throw new AppError(400, 'SHEET_URL_INVALID', 'Enter a valid Google Sheets URL');
  return id;
}

export function canonicalSheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}

export { normalizeRoll } from './captain-roll-matcher.js';

function key(value: unknown): string {
  return normalizeCell(value)
    .toLocaleLowerCase('en-US')
    .replace(/[.:_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function metadata(values: unknown[][], aliases: string[]): string | null {
  for (const row of values) {
    for (let index = 0; index < row.length; index += 1) {
      const current = key(row[index]);
      const alias = aliases.find(
        (candidate) => current === candidate || current.startsWith(candidate),
      );
      if (!alias) continue;
      const inline = normalizeCell(row[index]).replace(
        new RegExp(`^${alias}\\s*[:.-]?\\s*`, 'i'),
        '',
      );
      if (inline && key(inline) !== alias) return inline;
      for (let next = index + 1; next < Math.min(row.length, index + 4); next += 1) {
        const candidate = normalizeCell(row[next]);
        if (candidate) return candidate;
      }
    }
  }
  return null;
}

interface MetadataCell {
  row: number;
  column: number;
  value: string;
  normalized: string;
}

function metadataCells(values: unknown[][]): MetadataCell[] {
  return values.flatMap((row, rowIndex) =>
    row.flatMap((value, columnIndex) => {
      const text = normalizeCell(value);
      return text
        ? [
            {
              row: rowIndex,
              column: columnIndex,
              value: text,
              normalized: key(text),
            },
          ]
        : [];
    }),
  );
}

interface MetadataLine {
  row: number;
  column: number;
  lineIndex: number;
  value: string;
  normalized: string;
}

function metadataLines(values: unknown[][]): MetadataLine[] {
  return values.flatMap((row, rowIndex) =>
    row.flatMap((value, columnIndex) => {
      if (typeof value !== 'string' && typeof value !== 'number') {
        return [];
      }

      const rawValue = String(value).normalize('NFKC');

      return rawValue
        .split(/\r?\n/)
        .map((line) => normalizeCell(line))
        .filter(Boolean)
        .map((line, lineIndex) => ({
          row: rowIndex,
          column: columnIndex,
          lineIndex,
          value: line,
          normalized: key(line),
        }));
    }),
  );
}

function uniqueCandidate(
  values: string[],
  field: string,
  issues: Array<{ field: string; message: string }>,
): string | null {
  const unique = new Map<string, string>();
  for (const value of values.map((item) => item.trim()).filter(Boolean))
    unique.set(key(value), value);
  if (unique.size > 1) {
    issues.push({ field, message: `${field} metadata is ambiguous` });
    return null;
  }
  return unique.values().next().value ?? null;
}

function labeledCandidates(
  values: unknown[][],
  aliases: string[],
): { candidates: string[]; consumed: Set<string> } {
  const candidates: string[] = [];
  const consumed = new Set<string>();
  for (const item of metadataCells(values)) {
    const alias = aliases.find(
      (candidate) => item.normalized === candidate || item.normalized.startsWith(`${candidate} `),
    );
    if (!alias) continue;
    consumed.add(`${item.row}:${item.column}`);
    const inline = item.value.replace(new RegExp(`^${alias}\\s*[:.-]?\\s*`, 'i'), '').trim();
    if (inline && key(inline) !== alias) {
      candidates.push(inline);
      continue;
    }

    const row = values[item.row] ?? [];
    let candidateFound = false;

    // প্রথমে একই row-এর ডান পাশের প্রথম non-empty cell খুঁজবে
    for (let column = item.column + 1; column < row.length; column += 1) {
      const adjacent = normalizeCell(row[column]);

      if (!adjacent) continue;

      candidates.push(adjacent);
      consumed.add(`${item.row}:${column}`);
      candidateFound = true;
      break;
    }

    // একই row-তে value না থাকলে পরের row-এর একই column দেখবে
    if (!candidateFound) {
      const nextRow = values[item.row + 1] ?? [];
      const below = normalizeCell(nextRow[item.column]);

      if (below && key(below) !== alias) {
        candidates.push(below);
        consumed.add(`${item.row + 1}:${item.column}`);
      }
    }
  }
  return { candidates, consumed };
}

const ORDINAL = '(?:\\d{1,2}(?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|seventh|eighth)';

function structuredValue(text: string, label: 'semester' | 'shift'): string | null {
  const before = new RegExp(`\\b(${ORDINAL})\\s+${label}\\b`, 'i').exec(text);
  if (before) return before[1] ?? null;
  const after = new RegExp(`\\b${label}\\s*[:.-]?\\s*(${ORDINAL})\\b`, 'i').exec(text);
  return after?.[1] ?? null;
}

function departmentFromMetadataBlock(values: unknown[][]): string | null {
  const lines = metadataLines(values);

  const structuralLines = lines.filter(
    (line) =>
      structuredValue(line.value, 'semester') !== null ||
      structuredValue(line.value, 'shift') !== null,
  );

  if (!structuralLines.length) {
    return null;
  }

  const candidates = lines.filter((line) => {
    const value = line.value;
    const normalized = line.normalized;

    if (
      /\b(?:subject|course|teacher|instructor|semester|shift|attendance|sheet|roster)\b/i.test(
        value,
      )
    ) {
      return false;
    }

    if (
      /^(?:s\/?n|serial|name|student name|students name|shift|roll|roll no|roll number|class roll)$/i.test(
        normalized,
      )
    ) {
      return false;
    }

    if (/^\d+(?:[./-]\d+)+$/.test(value)) {
      return false;
    }

    if (/^[A-Z]{1,8}[- ]?\d{2,12}[A-Z]?$/i.test(value)) {
      return false;
    }

    if (!/\p{L}{2}/u.test(value)) {
      return false;
    }

    return true;
  });

  if (!candidates.length) {
    return null;
  }

  const scoreCandidate = (candidate: MetadataLine): number => {
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const structural of structuralLines) {
      let score = 0;

      const rowDistance = Math.abs(candidate.row - structural.row);
      const columnDistance = Math.abs(candidate.column - structural.column);

      if (candidate.row === structural.row && candidate.column === structural.column) {
        const lineDistance = Math.abs(candidate.lineIndex - structural.lineIndex);

        score = candidate.lineIndex < structural.lineIndex ? 100 - lineDistance : 60 - lineDistance;
      } else if (candidate.row === structural.row) {
        score = 50 - columnDistance;
      } else {
        score = 30 - rowDistance - columnDistance;
      }

      bestScore = Math.max(bestScore, score);
    }

    return bestScore;
  };

  const scoredCandidates = candidates.map((candidate) => ({
    candidate,
    score: scoreCandidate(candidate),
  }));

  const highestScore = Math.max(...scoredCandidates.map((item) => item.score));

  const nearestCandidates = scoredCandidates
    .filter((item) => item.score === highestScore)
    .map((item) => item.candidate.value);

  const unique = new Map<string, string>();

  for (const candidate of nearestCandidates) {
    unique.set(key(candidate), candidate);
  }

  return unique.size === 1 ? (unique.values().next().value ?? null) : null;
}

function extractClassIdentity(
  values: unknown[][],
  spreadsheetTitle: string,
): {
  department: string;
  semester: string;
  shift: string;
} {
  const issues: Array<{ field: string; message: string }> = [];
  const cells = metadataCells(values);
  const departmentLabel = labeledCandidates(values, ['department', 'dept']);
  const semesterLabel = labeledCandidates(values, ['semester', 'sem']);
  const shiftLabel = labeledCandidates(values, ['shift']);
  const excluded = new Set([
    ...departmentLabel.consumed,
    ...semesterLabel.consumed,
    ...shiftLabel.consumed,
  ]);
  for (const aliases of [
    ['subject name', 'subject code', 'subject', 'course name', 'course code'],
    ['teacher', 'instructor'],
  ])
    for (const position of labeledCandidates(values, aliases).consumed) excluded.add(position);

  const semesterExplicit = uniqueCandidate(
    semesterLabel.candidates.map((value) => structuredValue(value, 'semester') ?? value),
    'semester',
    issues,
  );
  const shiftExplicit = uniqueCandidate(
    shiftLabel.candidates.map((value) => structuredValue(value, 'shift') ?? value),
    'shift',
    issues,
  );
  const structuredLines = [...cells.map((item) => item.value), spreadsheetTitle];
  const semester =
    semesterExplicit ??
    uniqueCandidate(
      structuredLines
        .map((value) => structuredValue(value, 'semester'))
        .filter((value): value is string => Boolean(value)),
      'semester',
      issues,
    );
  const shift =
    shiftExplicit ??
    uniqueCandidate(
      structuredLines
        .map((value) => structuredValue(value, 'shift'))
        .filter((value): value is string => Boolean(value)),
      'shift',
      issues,
    );

  let department = uniqueCandidate(departmentLabel.candidates, 'department', issues);

  if (!department && !departmentLabel.candidates.length) {
    department = departmentFromMetadataBlock(values);
  }

  if (!department && !departmentLabel.candidates.length) {
    const structuralRows = cells
      .filter(
        (item) => structuredValue(item.value, 'semester') || structuredValue(item.value, 'shift'),
      )
      .map((item) => item.row);
    const fallbackCandidates = cells.filter((item) => {
      if (excluded.has(`${item.row}:${item.column}`)) return false;
      const normalized = item.normalized;
      if (
        /\b(?:subject|course|teacher|instructor|semester|shift|attendance|sheet|roster)\b/i.test(
          item.value,
        ) ||
        /^(?:s\/?n|serial|name|student name|roll|roll no|roll number|class roll)$/i.test(
          normalized,
        ) ||
        /^\d+(?:[./-]\d+)+$/.test(item.value) ||
        /^[A-Z]{1,8}[- ]?\d{2,12}[A-Z]?$/i.test(item.value) ||
        !/\p{L}{2}/u.test(item.value)
      )
        return false;
      return true;
    });
    if (fallbackCandidates.length) {
      const distance = (candidate: MetadataCell) =>
        structuralRows.length
          ? Math.min(...structuralRows.map((row) => Math.abs(row - candidate.row)))
          : Number.POSITIVE_INFINITY;
      const nearestDistance = Math.min(...fallbackCandidates.map(distance));
      const nearest = fallbackCandidates.filter(
        (candidate) => distance(candidate) === nearestDistance,
      );
      department = uniqueCandidate(
        nearest.map((candidate) => candidate.value),
        'department',
        issues,
      );
    }
  }
  if (!department && !issues.some((issue) => issue.field === 'department'))
    issues.push({ field: 'department', message: 'department metadata is missing' });
  if (!semester && !issues.some((issue) => issue.field === 'semester'))
    issues.push({ field: 'semester', message: 'semester metadata is missing' });
  if (!shift && !issues.some((issue) => issue.field === 'shift'))
    issues.push({ field: 'shift', message: 'shift metadata is missing' });
  if (issues.length)
    throw new AppError(
      422,
      'SHEET_STRUCTURE_UNSUPPORTED',
      'Required class metadata could not be detected safely',
      issues,
    );
  return { department: department!, semester: semester!, shift: shift! };
}

function subjectCode(title: string, values: unknown[][]): string | null {
  const titleMatch = title.toUpperCase().match(/\b(?:[A-Z]{2,8}[- ]?\d{2,4}[A-Z]?|\d{3,12})\b/);
  if (titleMatch) return titleMatch[0].replace(/\s+/g, '-');
  const fromMetadata = metadata(values, ['subject code', 'course code', 'code']);
  return fromMetadata?.toUpperCase().replace(/\s+/g, '-') ?? null;
}

function subjectName(values: unknown[][], code: string, title: string): string {
  const subjectAliases = ['subject name', 'course name', 'subject'];

  let metadataName = metadata(values, subjectAliases);

  if (!metadataName) {
    for (const line of metadataLines(values)) {
      const alias = subjectAliases.find(
        (candidate) => line.normalized === candidate || line.normalized.startsWith(`${candidate} `),
      );

      if (!alias) continue;

      metadataName = line.value.replace(new RegExp(`^${alias}\\s*[:.-]?\\s*`, 'i'), '').trim();

      break;
    }
  }

  if (metadataName) {
    const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const extracted = metadataName
      .replace(new RegExp(`\\s*\\(${escapedCode}\\)\\s*$`, 'i'), '')
      .replace(new RegExp(`\\s+${escapedCode}\\s*$`, 'i'), '')
      .trim();

    if (extracted && key(extracted) !== key(code)) {
      return extracted;
    }
  }

  const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const titleName = title
    .replace(new RegExp(escapedCode, 'i'), '')
    .replace(/^[\s:|()[\]_-]+|[\s:|()[\]_-]+$/g, '')
    .trim();

  return titleName || code;
}

function attendanceConvention(values: unknown[][], headerRow: number) {
  const row = values[headerRow] ?? [];
  const dateColumns = row
    .map((value, index) => {
      const text = normalizeCell(value);
      return typeof value === 'number' ||
        /^\d{4}-\d{2}-\d{2}$/.test(text) ||
        /^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(text)
        ? index
        : -1;
    })
    .filter((index) => index >= 0);
  const markers = new Set(
    values
      .slice(headerRow + 1)
      .flatMap((rowValue) => dateColumns.map((column) => key(rowValue[column])))
      .filter(Boolean),
  );
  if (markers.has('present') && markers.has('absent'))
    return {
      presentMarker: 'Present',
      absentMarker: 'Absent',
      dateFormat: 'DD/MM/YYYY',
    };
  return DEFAULT_ATTENDANCE_CONVENTION;
}

export function parseCaptainSheet(
  snapshot: SheetSnapshot,
  captainRoll: string,
): ParsedCaptainSheet {
  const expectedRoll = normalizeRoll(captainRoll);
  const warnings: string[] = [];
  const parsed: Array<{
    subject: ParsedCaptainSubject;
    department: string;
    semester: string;
    shift: string;
    structure: Record<string, unknown>;
  }> = [];
  let plannedCells = 0;
  if (snapshot.sheets.length > CAPTAIN_SHEET_SAFETY_LIMITS.maxTabs)
    throw new AppError(
      422,
      'SHEET_TOO_LARGE',
      'The spreadsheet exceeds the configured safe read limits',
    );

  for (const sheet of snapshot.sheets) {
    if (sheet.hidden) {
      warnings.push('HIDDEN_TAB_SKIPPED');
      continue;
    }
    const rowCount = sheet.rowCount ?? sheet.values.length;
    const columnCount = sheet.columnCount ?? Math.max(0, ...sheet.values.map((row) => row.length));
    plannedCells += rowCount * columnCount;
    if (
      rowCount > CAPTAIN_SHEET_SAFETY_LIMITS.maxRowsPerTab ||
      columnCount > CAPTAIN_SHEET_SAFETY_LIMITS.maxColumnsPerTab ||
      plannedCells > CAPTAIN_SHEET_SAFETY_LIMITS.maxCellsPerSpreadsheet
    )
      throw new AppError(
        422,
        'SHEET_TOO_LARGE',
        'The spreadsheet exceeds the configured safe read limits',
      );
    const values = sheet.values;
    let headerRow = -1;
    let rollColumn = -1;
    let nameColumn = -1;
    let shiftColumn = -1;
    for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
      const cells = values[rowIndex]!.map(key);
      const candidateRoll = cells.findIndex((cell) => ROLL_ALIASES.has(cell));
      if (candidateRoll < 0) continue;
      headerRow = rowIndex;
      rollColumn = candidateRoll;
      nameColumn = cells.findIndex((cell) => NAME_ALIASES.has(cell));
      shiftColumn = cells.findIndex((cell) => SHIFT_ALIASES.has(cell));
      break;
    }
    const upperValues = values.slice(0, Math.max(0, headerRow));
    const code = subjectCode(sheet.title, upperValues);
    if (headerRow < 0 || rollColumn < 0 || !code) {
      warnings.push('IRRELEVANT_TAB_SKIPPED');
      continue;
    }
    const rollMatch = matchRollInRows(values, headerRow, rollColumn, expectedRoll);
    if (rollMatch.type === 'not_found')
      throw new AppError(422, 'CAPTAIN_ROLL_NOT_FOUND', 'You are not a student in this class');
    if (rollMatch.type === 'duplicate')
      throw new AppError(422, 'CAPTAIN_ROLL_DUPLICATE', 'Captain roll appears more than once');
    const { department, semester, shift } = extractClassIdentity(upperValues, snapshot.title);
    const convention = attendanceConvention(values, headerRow);
    parsed.push({
      subject: {
        subjectCode: code,
        subjectName: subjectName(upperValues, code, sheet.title),
        sheetId: sheet.sheetId ?? -1,
        tabTitle: sheet.title,
        headerRow,
        rollColumn,
        ...convention,
      },
      department,
      semester,
      shift,
      structure: {
        title: sheet.title,
        code,
        headerRow,
        rollColumn,
        nameColumn,
        shiftColumn,
        gridRows: rowCount,
        gridColumns: columnCount,
        convention,
        merges: sheet.merges ?? [],
        protectedRanges: sheet.protectedRanges ?? [],
      },
    });
  }
  if (!parsed.length)
    throw new AppError(422, 'NO_VALID_SUBJECT_TABS', 'No valid subject tab was found');
  const identity = (item: (typeof parsed)[number]) =>
    [key(item.department), key(item.semester), key(item.shift)].join('|');
  if (new Set(parsed.map(identity)).size !== 1)
    throw new AppError(
      422,
      'CLASS_METADATA_INCONSISTENT',
      'Class metadata is inconsistent across subject tabs',
    );
  const subjects = new Map<string, ParsedCaptainSubject>();
  for (const item of parsed) {
    const existing = subjects.get(item.subject.subjectCode);
    if (existing && key(existing.subjectName) !== key(item.subject.subjectName))
      throw new AppError(
        422,
        'SUBJECT_CODE_CONFLICT',
        'A subject code is used by conflicting tabs',
      );
    subjects.set(item.subject.subjectCode, item.subject);
  }
  const [first] = parsed;
  const structureFingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        parser: CAPTAIN_PARSER_VERSION,
        sheets: parsed.map((item) => item.structure),
      }),
    )
    .digest('hex');
  return {
    spreadsheetId: snapshot.spreadsheetId,
    spreadsheetTitle: snapshot.title,
    department: first!.department,
    semester: first!.semester,
    shift: first!.shift,
    subjects: [...subjects.values()].sort((a, b) => a.subjectCode.localeCompare(b.subjectCode)),
    warnings,
    structureFingerprint,
  };
}
