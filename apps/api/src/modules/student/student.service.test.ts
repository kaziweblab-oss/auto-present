import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentService } from './student.service.js';

const userId = '507f1f77bcf86cd799439011';
const sessionId = '507f1f77bcf86cd799439012';

function studentRepository() {
  return {
    findStudentSession: vi.fn().mockResolvedValue({ _id: sessionId }),
    findByUserId: vi.fn().mockResolvedValue(null),
    findActiveByUserId: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(undefined),
    updateAfterVerification: vi.fn().mockResolvedValue(undefined),
    markReverificationRequired: vi.fn().mockResolvedValue(undefined),
  };
}

function captainRepository() {
  return {
    findStudentClassRegistration: vi.fn().mockResolvedValue(null),
    findCredential: vi.fn().mockResolvedValue(null),
    findUser: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
    findActiveRegistrationOptions: vi.fn().mockResolvedValue([]),
  };
}

function sheetReader() {
  return {
    validateConnection: vi.fn(),
    readSpreadsheet: vi.fn().mockResolvedValue({
      spreadsheetId: '1abcdefghijklmnopqrstuvwxyzABCDE',
      title: 'Cloned Attendance',
      sheets: [],
    }),
  };
}

function classRegistration(subjects: unknown[] = []) {
  return {
    _id: 'classRegId',
    spreadsheetId: 'sheet',
    captainUserId: 'captainUserId',
    subjects,
  };
}

function subjectStub(
  overrides: Partial<{
    subjectCode: string;
    subjectName: string;
    sheetId: number;
    tabTitle: string;
    headerRow: number;
    rollColumn: number;
    presentMarker: string;
    absentMarker: string;
    dateFormat: string;
  }> = {},
) {
  return {
    subjectCode: 'CSE-101',
    subjectName: 'Data Structures',
    sheetId: 42,
    tabTitle: 'CSE-101',
    headerRow: 2,
    rollColumn: 1,
    presentMarker: 'P',
    absentMarker: 'A',
    dateFormat: 'DD/MM/YYYY',
    ...overrides,
  };
}

describe('StudentService', () => {
  let repo: ReturnType<typeof studentRepository>;
  let captainRepo: ReturnType<typeof captainRepository>;
  let sheets: ReturnType<typeof sheetReader>;

  beforeEach(() => {
    repo = studentRepository();
    captainRepo = captainRepository();
    sheets = sheetReader();
  });

  it('rejects status when no valid Student session exists', async () => {
    repo.findStudentSession.mockResolvedValue(null);
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    await expect(service.status(userId, sessionId)).rejects.toMatchObject({
      code: 'STUDENT_ACCESS_DENIED',
    });
  });

  it('returns UNCONFIRMED when no active Student registration exists', async () => {
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    await expect(service.status(userId, sessionId)).resolves.toEqual({
      identity: { status: 'UNCONFIRMED', roll: null },
      canViewAttendance: false,
    });
  });

  it('returns CONFIRMED with the stored roll when an active registration exists', async () => {
    repo.findActiveByUserId.mockResolvedValue({ roll: '007' });
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    await expect(service.status(userId, sessionId)).resolves.toEqual({
      identity: { status: 'CONFIRMED', roll: '007' },
      canViewAttendance: true,
    });
  });

  it('rejects registration options when no valid Student session exists', async () => {
    repo.findStudentSession.mockResolvedValue(null);
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    await expect(service.getRegistrationOptions(userId, sessionId)).rejects.toMatchObject({
      code: 'STUDENT_ACCESS_DENIED',
    });
  });

  it('returns deduplicated registration options from active captain registrations', async () => {
    const raw = [
      {
        department: 'CST',
        departmentKey: 'cst',
        semester: '5th',
        semesterKey: '5th',
        shift: 'Morning',
        shiftKey: 'morning',
      },
      {
        department: 'CST',
        departmentKey: 'cst',
        semester: '5th',
        semesterKey: '5th',
        shift: 'Evening',
        shiftKey: 'evening',
      },
      {
        department: 'CST',
        departmentKey: 'cst',
        semester: '7th',
        semesterKey: '7th',
        shift: 'Morning',
        shiftKey: 'morning',
      },
      {
        department: 'EEE',
        departmentKey: 'eee',
        semester: '3rd',
        semesterKey: '3rd',
        shift: 'Day',
        shiftKey: 'day',
      },
    ];
    captainRepo.findActiveRegistrationOptions.mockResolvedValue(raw);
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    const result = await service.getRegistrationOptions(userId, sessionId);

    expect(result.options).toHaveLength(4);
    expect(result.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ department: 'CST', semester: '5th', shift: 'Morning' }),
        expect.objectContaining({ department: 'CST', semester: '5th', shift: 'Evening' }),
        expect.objectContaining({ department: 'CST', semester: '7th', shift: 'Morning' }),
        expect.objectContaining({ department: 'EEE', semester: '3rd', shift: 'Day' }),
      ]),
    );
  });

  it('deduplicates duplicate combinations from the captain repository', async () => {
    const raw = [
      {
        department: 'CST',
        departmentKey: 'cst',
        semester: '5th',
        semesterKey: '5th',
        shift: 'Morning',
        shiftKey: 'morning',
      },
      {
        department: 'CST',
        departmentKey: 'cst',
        semester: '5th',
        semesterKey: '5th',
        shift: 'Morning',
        shiftKey: 'morning',
      },
    ];
    captainRepo.findActiveRegistrationOptions.mockResolvedValue(raw);
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    const result = await service.getRegistrationOptions(userId, sessionId);

    expect(result.options).toHaveLength(1);
  });

  it('rejects registration when no active Captain class registration matches', async () => {
    captainRepo.findStudentClassRegistration.mockResolvedValue(null);
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    await expect(
      service.register(userId, sessionId, 'CST', '5th', 'Morning', '007'),
    ).rejects.toMatchObject({ code: 'CLASS_REGISTRATION_NOT_FOUND' });
    expect(sheets.readSpreadsheet).not.toHaveBeenCalled();
  });

  it('rejects registration when the Captain Google credential is unavailable', async () => {
    captainRepo.findStudentClassRegistration.mockResolvedValue(classRegistration([subjectStub()]));
    captainRepo.findCredential.mockResolvedValue(null);
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    await expect(
      service.register(userId, sessionId, 'CST', '5th', 'Morning', '007'),
    ).rejects.toMatchObject({ code: 'CLASS_WORKSPACE_DISCONNECTED' });
    expect(sheets.readSpreadsheet).not.toHaveBeenCalled();
  });

  it('rejects registration when the Student roll is not found in the Sheet', async () => {
    captainRepo.findStudentClassRegistration.mockResolvedValue(classRegistration([subjectStub()]));
    captainRepo.findCredential.mockResolvedValue({ status: 'CONNECTED' });
    sheets.readSpreadsheet.mockResolvedValue({
      spreadsheetId: 'sheet',
      title: 'Attendance',
      sheets: [
        {
          sheetId: 42,
          title: 'CSE-101',
          hidden: false,
          values: [
            ['Department', 'CST'],
            ['Semester', '5th'],
            ['Name', 'Roll'],
            ['Alice', '001'],
          ],
        },
      ],
    });
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    await expect(
      service.register(userId, sessionId, 'CST', '5th', 'Morning', '007'),
    ).rejects.toMatchObject({ code: 'STUDENT_ROLL_NOT_FOUND' });
  });

  it('rejects registration when the Student roll appears more than once', async () => {
    captainRepo.findStudentClassRegistration.mockResolvedValue(classRegistration([subjectStub()]));
    captainRepo.findCredential.mockResolvedValue({ status: 'CONNECTED' });
    sheets.readSpreadsheet.mockResolvedValue({
      spreadsheetId: 'sheet',
      title: 'Attendance',
      sheets: [
        {
          sheetId: 42,
          title: 'CSE-101',
          hidden: false,
          values: [
            ['Department', 'CST'],
            ['Semester', '5th'],
            ['Name', 'Roll'],
            ['Alice', '007'],
            ['Bob', '007'],
          ],
        },
      ],
    });
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    await expect(
      service.register(userId, sessionId, 'CST', '5th', 'Morning', '007'),
    ).rejects.toMatchObject({ code: 'STUDENT_ROLL_DUPLICATE' });
  });

  it('creates a Student registration after successful first verification', async () => {
    captainRepo.findStudentClassRegistration.mockResolvedValue(classRegistration([subjectStub()]));
    captainRepo.findCredential.mockResolvedValue({ status: 'CONNECTED' });
    sheets.readSpreadsheet.mockResolvedValue({
      spreadsheetId: 'sheet',
      title: 'Attendance',
      sheets: [
        {
          sheetId: 42,
          title: 'CSE-101',
          hidden: false,
          values: [
            ['Department', 'CST'],
            ['Semester', '5th'],
            ['Name', 'Roll'],
            ['Bob', '007'],
          ],
        },
      ],
    });
    repo.findByUserId.mockResolvedValue(null);
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    const result = await service.register(userId, sessionId, 'CST', '5th', 'Morning', '  007  ');

    expect(result).toEqual({
      identity: { status: 'CONFIRMED', roll: '007' },
      canViewAttendance: true,
    });
    expect(repo.create).toHaveBeenCalledTimes(1);
    const createInput = repo.create.mock.calls[0]![0] as Record<string, unknown>;
    expect(createInput).toMatchObject({
      userId,
      department: 'CST',
      departmentKey: 'cst',
      semester: '5th',
      semesterKey: '5th',
      shift: 'Morning',
      shiftKey: 'morning',
      roll: '007',
      rollKey: '007',
      captainRegistrationId: 'classRegId',
      spreadsheetId: 'sheet',
      status: 'ACTIVE',
    });
    expect(createInput.verifiedAt).toBeInstanceOf(Date);
    expect(Object.keys(createInput)).not.toContain('values');
    expect(Object.keys(createInput)).not.toContain('subjects');
    expect(JSON.stringify(createInput)).not.toContain('Data Structures');
    expect(JSON.stringify(createInput)).not.toContain('Bob');
    expect(repo.updateAfterVerification).not.toHaveBeenCalled();
  });

  it('updates the existing Student registration during successful re-verification', async () => {
    captainRepo.findStudentClassRegistration.mockResolvedValue(classRegistration([subjectStub()]));
    captainRepo.findCredential.mockResolvedValue({ status: 'CONNECTED' });
    sheets.readSpreadsheet.mockResolvedValue({
      spreadsheetId: 'sheet',
      title: 'Attendance',
      sheets: [
        {
          sheetId: 42,
          title: 'CSE-101',
          hidden: false,
          values: [
            ['Department', 'CST'],
            ['Semester', '5th'],
            ['Name', 'Roll'],
            ['Bob', '007'],
          ],
        },
      ],
    });
    repo.findByUserId.mockResolvedValue({ _id: 'existingReg' });
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    const result = await service.register(userId, sessionId, 'CST', '5th', 'Morning', '007');

    expect(result).toEqual({
      identity: { status: 'CONFIRMED', roll: '007' },
      canViewAttendance: true,
    });
    expect(repo.updateAfterVerification).toHaveBeenCalledTimes(1);
    expect(repo.create).not.toHaveBeenCalled();
    const updateInput = repo.updateAfterVerification.mock.calls[0]![1] as Record<string, unknown>;
    expect(updateInput).toMatchObject({
      department: 'CST',
      departmentKey: 'cst',
      semester: '5th',
      semesterKey: '5th',
      shift: 'Morning',
      shiftKey: 'morning',
      roll: '007',
      rollKey: '007',
      captainRegistrationId: 'classRegId',
      spreadsheetId: 'sheet',
      status: 'ACTIVE',
    });
    expect(updateInput.verifiedAt).toBeInstanceOf(Date);
  });

  it('rejects dashboard when no active Student registration exists', async () => {
    repo.findActiveByUserId.mockResolvedValue(null);
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    await expect(service.dashboard(userId, sessionId)).rejects.toMatchObject({
      code: 'STUDENT_REGISTRATION_REQUIRED',
    });
  });

  it('returns the correct student identity, subject list, and attendance summary for a valid Sheet snapshot', async () => {
    const subject = subjectStub();
    captainRepo.findStudentClassRegistration.mockResolvedValue(classRegistration([subject]));
    captainRepo.findCredential.mockResolvedValue({ status: 'CONNECTED' });
    captainRepo.findUser.mockResolvedValue({
      displayName: 'Bob',
      email: 'bob@test.com',
      status: 'ACTIVE',
    });
    repo.findActiveByUserId.mockResolvedValue({
      roll: '007',
      departmentKey: 'cst',
      semesterKey: '5th',
      shiftKey: 'morning',
    });
    sheets.readSpreadsheet.mockResolvedValue({
      spreadsheetId: 'sheet',
      title: 'Attendance',
      sheets: [
        {
          sheetId: 42,
          title: 'CSE-101',
          hidden: false,
          values: [
            ['Department', 'CST'],
            ['Semester', '5th'],
            ['Name', 'Roll', '2024-01-01', '2024-01-02'],
            ['Alice', '001', 'P', 'P'],
            ['Bob', '007', 'P', 'A'],
          ],
        },
      ],
    });
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    const result = await service.dashboard(userId, sessionId);

    expect(result).toEqual({
      student: { displayName: 'Bob', email: 'bob@test.com', roll: '007' },
      subjects: [{ subjectCode: 'CSE-101', subjectName: 'Data Structures' }],
      attendanceSummaries: [
        {
          subjectCode: 'CSE-101',
          subjectName: 'Data Structures',
          totalClasses: 2,
          presentClasses: 1,
          absentClasses: 1,
          attendancePercentage: 50,
        },
      ],
    });
  });

  it('filters attendance history by subjectCode and date range', async () => {
    const cse = subjectStub();
    const mat = subjectStub({
      subjectCode: 'MAT-201',
      subjectName: 'Mathematics',
      sheetId: 43,
      tabTitle: 'MAT-201',
    });
    captainRepo.findStudentClassRegistration.mockResolvedValue(classRegistration([cse, mat]));
    captainRepo.findCredential.mockResolvedValue({ status: 'CONNECTED' });
    repo.findActiveByUserId.mockResolvedValue({
      roll: '007',
      departmentKey: 'cst',
      semesterKey: '5th',
      shiftKey: 'morning',
    });
    sheets.readSpreadsheet.mockResolvedValue({
      spreadsheetId: 'sheet',
      title: 'Attendance',
      sheets: [
        {
          sheetId: 42,
          title: 'CSE-101',
          hidden: false,
          values: [
            ['Department', 'CST'],
            ['Semester', '5th'],
            ['Name', 'Roll', '2024-01-01', '2024-01-15'],
            ['Bob', '007', 'P', 'P'],
          ],
        },
        {
          sheetId: 43,
          title: 'MAT-201',
          hidden: false,
          values: [
            ['Department', 'CST'],
            ['Semester', '5th'],
            ['Name', 'Roll', '2024-01-08', '2024-01-22'],
            ['Bob', '007', 'P', 'A'],
          ],
        },
      ],
    });
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    const result = await service.attendanceHistory(userId, sessionId, {
      subjectCode: 'CSE-101',
      dateFrom: '2024-01-08',
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toEqual({
      subjectCode: 'CSE-101',
      subjectName: 'Data Structures',
      date: '2024-01-15',
      status: 'PRESENT',
    });
  });

  it('returns empty records when no matching attendance data exists', async () => {
    captainRepo.findStudentClassRegistration.mockResolvedValue(classRegistration([subjectStub()]));
    captainRepo.findCredential.mockResolvedValue({ status: 'CONNECTED' });
    repo.findActiveByUserId.mockResolvedValue({
      roll: '007',
      departmentKey: 'cst',
      semesterKey: '5th',
      shiftKey: 'morning',
    });
    sheets.readSpreadsheet.mockResolvedValue({
      spreadsheetId: 'sheet',
      title: 'Attendance',
      sheets: [
        {
          sheetId: 42,
          title: 'CSE-101',
          hidden: false,
          values: [
            ['Department', 'CST'],
            ['Semester', '5th'],
            ['Name', 'Roll', '2024-01-01'],
            ['Alice', '999', 'P'],
          ],
        },
      ],
    });
    const service = new StudentService(repo as never, captainRepo as never, sheets as never);
    const result = await service.attendanceHistory(userId, sessionId, {});

    expect(result).toEqual({ records: [] });
  });
});
