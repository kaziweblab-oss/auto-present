import type {
  StudentAttendanceHistoryInput,
  StudentAttendanceHistoryResponse,
  StudentAttendanceRecord,
  StudentAttendanceStatus,
  StudentAttendanceSummary,
  StudentDashboardResponse,
  StudentRegistrationOption,
  StudentRegistrationOptionsResponse,
  StudentStatusResponse,
  StudentSubject,
} from '@auto-present/shared';
import { AppError } from '../../errors/app-error.js';
import { type StoredSubjectStructure, normalizeSheetDate } from '../captain/captain.attendance.js';
import {
  GoogleCaptainSheetReader,
  type CaptainGoogleCredential,
  type CaptainSheetReader,
} from '../captain/captain.google.js';
import { type ClassSheetRegistrationRecord } from '../captain/captain.models.js';
import { matchRollInRows, normalizeRoll } from '../captain/captain-roll-matcher.js';
import { CaptainRepository } from '../captain/captain.repository.js';
import { StudentRepository } from './student.repository.js';

type LeanClassRegistration = ClassSheetRegistrationRecord & { _id: string };

function normalizeCell(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).normalize('NFKC').trim().replace(/\s+/g, ' ')
    : '';
}

function identityKey(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

const SUMMARY_COLUMN_ALIASES: Record<string, 'present' | 'absent' | 'total' | 'percentage'> = {
  'total present': 'present',
  'total absent': 'absent',
  'total class': 'total',
  percentage: 'percentage',
};

function normalizeHeaderText(value: unknown): string {
  return normalizeCell(value).toLocaleLowerCase('en-US');
}

function findSummaryColumns(
  headerValues: unknown[],
  tabTitle: string,
): {
  presentColumn: number;
  absentColumn: number;
  totalColumn: number;
  percentageColumn: number;
} {
  const found: Partial<Record<'present' | 'absent' | 'total' | 'percentage', number>> = {};

  for (let column = 0; column < headerValues.length; column += 1) {
    const normalized = normalizeHeaderText(headerValues[column]);
    if (!normalized) continue;

    const role = SUMMARY_COLUMN_ALIASES[normalized];
    if (role && found[role] === undefined) {
      found[role] = column;
    }
  }

  const missing: string[] = [];
  if (found.present === undefined) missing.push('Total Present');
  if (found.absent === undefined) missing.push('Total Absent');
  if (found.total === undefined) missing.push('Total Class');
  if (found.percentage === undefined) missing.push('Percentage');

  if (missing.length > 0) {
    throw new AppError(
      422,
      'SHEET_SUMMARY_COLUMNS_MISSING',
      `Summary columns not found for tab "${tabTitle}": ${missing.join(', ')}`,
      missing.map((name) => ({
        field: 'summaryColumn',
        message: `Required column "${name}" is missing from the header row`,
      })),
    );
  }

  return {
    presentColumn: found.present!,
    absentColumn: found.absent!,
    totalColumn: found.total!,
    percentageColumn: found.percentage!,
  };
}

function parseNumericValue(
  value: unknown,
  label: string,
  subjectCode: string,
  tabTitle: string,
): number {
  const raw = normalizeCell(value);
  if (!raw) {
    throw new AppError(
      422,
      'SHEET_SUMMARY_VALUE_INVALID',
      `Summary value "${label}" is empty for subject "${subjectCode}" in tab "${tabTitle}"`,
      [{ field: label, message: `The cell for "${label}" is empty or missing` }],
    );
  }

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError(
      422,
      'SHEET_SUMMARY_VALUE_INVALID',
      `Summary value "${label}" is invalid for subject "${subjectCode}" in tab "${tabTitle}": received "${raw}"`,
      [{ field: label, message: `Expected a non-negative number, got "${raw}"` }],
    );
  }

  return Math.round(parsed);
}

function parsePercentValue(
  value: unknown,
  label: string,
  subjectCode: string,
  tabTitle: string,
): number {
  const raw = normalizeCell(value);
  if (!raw) {
    throw new AppError(
      422,
      'SHEET_SUMMARY_VALUE_INVALID',
      `Summary value "${label}" is empty for subject "${subjectCode}" in tab "${tabTitle}"`,
      [{ field: label, message: `The cell for "${label}" is empty or missing` }],
    );
  }

  const stripped = raw.replace(/%$/, '').trim();
  const parsed = Number.parseFloat(stripped);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError(
      422,
      'SHEET_SUMMARY_VALUE_INVALID',
      `Summary value "${label}" is invalid for subject "${subjectCode}" in tab "${tabTitle}": received "${raw}"`,
      [{ field: label, message: `Expected a numeric percentage, got "${raw}"` }],
    );
  }

  return Math.round(parsed);
}

export class StudentService {
  constructor(
    private readonly studentRepository = new StudentRepository(),
    private readonly captainRepository = new CaptainRepository(),
    private readonly sheetReader: CaptainSheetReader = new GoogleCaptainSheetReader(),
  ) {}

  private async authorizeStudent(userId: string, sessionId: string) {
    const session = await this.studentRepository.findStudentSession(userId, sessionId);
    if (!session)
      throw new AppError(403, 'STUDENT_ACCESS_DENIED', 'Authenticated Student access is required');
    const user = await this.captainRepository.findUser(userId);
    if (!user || user.status !== 'ACTIVE')
      throw new AppError(401, 'ACCOUNT_SUSPENDED', 'Account is not active');
  }

  async status(userId: string, sessionId: string): Promise<StudentStatusResponse> {
    await this.authorizeStudent(userId, sessionId);

    const registration = await this.studentRepository.findActiveByUserId(userId);

    if (!registration) {
      return {
        identity: { status: 'UNCONFIRMED', roll: null },
        canViewAttendance: false,
      };
    }

    return {
      identity: { status: 'CONFIRMED', roll: registration.roll },
      canViewAttendance: true,
    };
  }

  async getRegistrationOptions(
    userId: string,
    sessionId: string,
  ): Promise<StudentRegistrationOptionsResponse> {
    await this.authorizeStudent(userId, sessionId);

    const raw = (await this.captainRepository.findActiveRegistrationOptions()) as Array<{
      department: string;
      departmentKey: string;
      semester: string;
      semesterKey: string;
      shift: string;
      shiftKey: string;
    }>;

    const seen = new Set<string>();
    const options: StudentRegistrationOption[] = [];
    for (const item of raw) {
      const key = `${item.departmentKey}|${item.semesterKey}|${item.shiftKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({
        department: item.department,
        departmentKey: item.departmentKey,
        semester: item.semester,
        semesterKey: item.semesterKey,
        shift: item.shift,
        shiftKey: item.shiftKey,
      });
    }

    return { options };
  }

  async register(
    userId: string,
    sessionId: string,
    department: string,
    semester: string,
    shift: string,
    roll: string,
  ): Promise<StudentStatusResponse> {
    await this.authorizeStudent(userId, sessionId);

    const departmentKey = identityKey(department);
    const semesterKey = identityKey(semester);
    const shiftKey = identityKey(shift);
    const rollKey = normalizeRoll(roll);

    const classRegistration = (await this.captainRepository.findStudentClassRegistration(
      departmentKey,
      semesterKey,
      shiftKey,
    )) as LeanClassRegistration | null;
    if (!classRegistration)
      throw new AppError(
        404,
        'CLASS_REGISTRATION_NOT_FOUND',
        'No active class registration matches the provided class identity',
      );

    const credential = (await this.captainRepository.findCredential(
      classRegistration.captainUserId.toString(),
    )) as CaptainGoogleCredential | null;
    if (!credential)
      throw new AppError(
        409,
        'CLASS_WORKSPACE_DISCONNECTED',
        'The class Google Workspace connection is no longer available',
      );

    const snapshot = await this.sheetReader.readSpreadsheet(
      classRegistration.spreadsheetId,
      credential,
    );

    const subjects = classRegistration.subjects as StoredSubjectStructure[];
    const firstSubject = subjects[0];
    if (!firstSubject)
      throw new AppError(422, 'CLASS_NO_SUBJECTS', 'The class registration has no subjects');

    const subjectTab = snapshot.sheets.find((s) => s.sheetId === firstSubject.sheetId);
    if (!subjectTab || !subjectTab.values.length)
      throw new AppError(
        409,
        'REGISTRATION_STRUCTURE_CHANGED',
        'The class sheet structure has changed; try again',
      );

    const rollMatch = matchRollInRows(
      subjectTab.values,
      firstSubject.headerRow,
      firstSubject.rollColumn,
      rollKey,
    );

    if (rollMatch.type === 'not_found')
      throw new AppError(422, 'STUDENT_ROLL_NOT_FOUND', 'Roll not found in the class sheet');
    if (rollMatch.type === 'duplicate')
      throw new AppError(
        422,
        'STUDENT_ROLL_DUPLICATE',
        'Roll appears more than once in the class sheet',
      );

    const registeredRoll = roll.trim();
    const now = new Date();

    try {
      const existing = await this.studentRepository.findByUserId(userId);

      if (existing) {
        await this.studentRepository.updateAfterVerification(userId, {
          department,
          departmentKey,
          semester,
          semesterKey,
          shift,
          shiftKey,
          roll: registeredRoll,
          rollKey,
          captainRegistrationId: String(classRegistration._id),
          spreadsheetId: classRegistration.spreadsheetId,
          verifiedAt: now,
          status: 'ACTIVE',
        });
      } else {
        await this.studentRepository.create({
          userId,
          department,
          departmentKey,
          semester,
          semesterKey,
          shift,
          shiftKey,
          roll: registeredRoll,
          rollKey,
          captainRegistrationId: String(classRegistration._id),
          spreadsheetId: classRegistration.spreadsheetId,
          verifiedAt: now,
          status: 'ACTIVE',
        });
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        500,
        'STUDENT_REGISTRATION_FAILED',
        'Student registration could not be saved',
      );
    }

    return {
      identity: { status: 'CONFIRMED', roll: registeredRoll },
      canViewAttendance: true,
    };
  }

  async dashboard(userId: string, sessionId: string): Promise<StudentDashboardResponse> {
    await this.authorizeStudent(userId, sessionId);

    const { registration, classRegistration, snapshot } = await this.resolveClassSheet(userId);
    const user = await this.captainRepository.findUser(userId);
    if (!user) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');

    const subjects: StudentSubject[] = [];
    const attendanceSummaries: StudentAttendanceSummary[] = [];
    const normalizedStudentRoll = normalizeRoll(registration.roll);

    for (const subject of classRegistration.subjects as StoredSubjectStructure[]) {
      subjects.push({
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
      });

      const tab = snapshot.sheets.find((s) => s.sheetId === subject.sheetId);
      if (!tab || tab.hidden || !tab.values.length) {
        attendanceSummaries.push(zeroSummary(subject));
        continue;
      }

      const studentRow = findStudentDataRow(
        tab.values,
        subject.headerRow,
        subject.rollColumn,
        normalizedStudentRoll,
      );

      if (studentRow < 0) {
        attendanceSummaries.push(zeroSummary(subject));
        continue;
      }

      const headerValues = tab.values[subject.headerRow];
      if (!headerValues) {
        attendanceSummaries.push(zeroSummary(subject));
        continue;
      }

      const summaryColumns = findSummaryColumns(headerValues, tab.title);

      const studentRowData = tab.values[studentRow];
      if (!studentRowData) {
        throw new AppError(
          422,
          'SHEET_SUMMARY_VALUE_INVALID',
          `Student row is empty for subject "${subject.subjectCode}" in tab "${tab.title}"`,
          [{ field: 'studentRow', message: 'The student row contains no data' }],
        );
      }
      const presentClasses = parseNumericValue(
        studentRowData[summaryColumns.presentColumn],
        'Total Present',
        subject.subjectCode,
        tab.title,
      );
      const absentClasses = parseNumericValue(
        studentRowData[summaryColumns.absentColumn],
        'Total Absent',
        subject.subjectCode,
        tab.title,
      );
      const totalClasses = parseNumericValue(
        studentRowData[summaryColumns.totalColumn],
        'Total Class',
        subject.subjectCode,
        tab.title,
      );
      const attendancePercentage = parsePercentValue(
        studentRowData[summaryColumns.percentageColumn],
        'Percentage',
        subject.subjectCode,
        tab.title,
      );

      attendanceSummaries.push({
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        totalClasses,
        presentClasses,
        absentClasses,
        attendancePercentage,
      });
    }

    return {
      student: {
        displayName: user.displayName,
        email: user.email,
        roll: registration.roll,
      },
      subjects,
      attendanceSummaries,
    };
  }

  async attendanceHistory(
    userId: string,
    sessionId: string,
    input: StudentAttendanceHistoryInput,
  ): Promise<StudentAttendanceHistoryResponse> {
    await this.authorizeStudent(userId, sessionId);

    const { registration, classRegistration, snapshot } = await this.resolveClassSheet(userId);

    const normalizedStudentRoll = normalizeRoll(registration.roll);
    const records: StudentAttendanceRecord[] = [];
    const subjectSet = input.subjectCode ? new Set([input.subjectCode]) : null;

    for (const subject of classRegistration.subjects as StoredSubjectStructure[]) {
      if (subjectSet && !subjectSet.has(subject.subjectCode)) continue;

      const tab = snapshot.sheets.find((s) => s.sheetId === subject.sheetId);
      if (!tab || tab.hidden || !tab.values.length) continue;

      const studentRow = findStudentDataRow(
        tab.values,
        subject.headerRow,
        subject.rollColumn,
        normalizedStudentRoll,
      );

      if (studentRow < 0) continue;

      const headerValues = tab.values[subject.headerRow];
      if (!headerValues) continue;

      const normalizedPresentMarker = normalizeRoll(subject.presentMarker);

      for (let column = 0; column < headerValues.length; column += 1) {
        const dateStr = normalizeSheetDate(headerValues[column]);
        if (!dateStr) continue;

        if (input.dateFrom && dateStr < input.dateFrom) continue;
        if (input.dateTo && dateStr > input.dateTo) continue;

        const marker = normalizeCell(tab.values[studentRow]?.[column]);
        if (!marker) continue;

        const status: StudentAttendanceStatus =
          normalizeRoll(marker) === normalizedPresentMarker ? 'PRESENT' : 'ABSENT';

        records.push({
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          date: dateStr,
          status,
        });
      }
    }

    records.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return a.subjectCode.localeCompare(b.subjectCode);
    });

    return { records };
  }

  private async resolveClassSheet(userId: string) {
    const registration = await this.studentRepository.findActiveByUserId(userId);
    if (!registration)
      throw new AppError(409, 'STUDENT_REGISTRATION_REQUIRED', 'Student registration is required');

    const classRegistration = (await this.captainRepository.findStudentClassRegistration(
      registration.departmentKey,
      registration.semesterKey,
      registration.shiftKey,
    )) as LeanClassRegistration | null;
    if (!classRegistration)
      throw new AppError(
        409,
        'CLASS_REGISTRATION_NOT_FOUND',
        'The class registration is no longer active',
      );

    const credential = (await this.captainRepository.findCredential(
      classRegistration.captainUserId.toString(),
    )) as CaptainGoogleCredential | null;
    if (!credential)
      throw new AppError(
        409,
        'CLASS_WORKSPACE_DISCONNECTED',
        'The class Google Workspace connection is no longer available',
      );

    const snapshot = await this.sheetReader.readSpreadsheet(
      classRegistration.spreadsheetId,
      credential,
    );

    return { registration, classRegistration, snapshot };
  }
}

function zeroSummary(subject: StoredSubjectStructure): StudentAttendanceSummary {
  return {
    subjectCode: subject.subjectCode,
    subjectName: subject.subjectName,
    totalClasses: 0,
    presentClasses: 0,
    absentClasses: 0,
    attendancePercentage: 0,
  };
}

function findStudentDataRow(
  values: unknown[][],
  headerRow: number,
  rollColumn: number,
  normalizedRollTarget: string,
): number {
  for (let row = headerRow + 1; row < values.length; row += 1) {
    const cellValue = normalizeCell(values[row]?.[rollColumn]);
    if (cellValue && normalizeRoll(cellValue) === normalizedRollTarget) {
      return row;
    }
  }
  return -1;
}
