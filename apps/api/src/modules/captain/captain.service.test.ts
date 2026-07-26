import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../errors/app-error.js';
import { CaptainService } from './captain.service.js';

const userId = '507f1f77bcf86cd799439011';
const sessionId = '507f1f77bcf86cd799439012';
const sheetUrl = 'https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxyzABCDE/edit';

function repository() {
  return {
    findCaptainSession: vi.fn().mockResolvedValue({ _id: sessionId }),

    findCredential: vi.fn().mockResolvedValue({
      status: 'CONNECTED',
      ciphertext: 'ciphertext',
      iv: 'iv',
      authTag: 'auth-tag',
      keyVersion: 'v1',
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ],
    }),
    markCredentialReconnectRequired: vi.fn().mockResolvedValue(undefined),

    findActive: vi.fn().mockResolvedValue(null),
    findUser: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
    registerVersion: vi.fn().mockImplementation((_userId, data) => ({
      _id: 'registration',
      ...data,
      version: 1,
    })),
    audit: vi.fn().mockResolvedValue(undefined),
    addUserRole: vi.fn().mockResolvedValue({}),
  };
}

function reader() {
  return {
    validateConnection: vi.fn().mockResolvedValue(undefined),

    readSpreadsheet: vi.fn().mockResolvedValue({
      spreadsheetId: '1abcdefghijklmnopqrstuvwxyzABCDE',
      title: 'Cloned Attendance',
      sheets: [
        {
          title: 'CSE-101',
          hidden: false,
          values: [
            ['Department', 'CST'],
            ['Semester', '5th'],
            ['Shift', 'Morning'],
            ['Subject Name', 'Data Structures'],
            ['Name', 'Roll'],
            ['Captain Name', '007'],
          ],
        },
      ],
    }),
  };
}

describe('CaptainService', () => {
  let repo: ReturnType<typeof repository>;
  let sheets: ReturnType<typeof reader>;
  beforeEach(() => {
    repo = repository();
    sheets = reader();
  });

  it('requires an active authenticated Captain session, not role intent alone', async () => {
    repo.findCaptainSession.mockResolvedValue(null);
    const service = new CaptainService(repo as never, sheets);
    await expect(service.status(userId, sessionId)).rejects.toMatchObject({
      code: 'CAPTAIN_ACCESS_DENIED',
    });
    expect(repo.findCredential).not.toHaveBeenCalled();
  });

  it('returns NOT_CONNECTED without exposing a stored registration when no credential exists', async () => {
    repo.findCredential.mockResolvedValue(null);
    repo.findActive.mockResolvedValue({ _id: 'old-registration' });

    const service = new CaptainService(repo as never, sheets);

    await expect(service.status(userId, sessionId)).resolves.toEqual({
      workspaceStatus: 'NOT_CONNECTED',
      registration: null,
    });

    expect(sheets.validateConnection).not.toHaveBeenCalled();
    expect(repo.findActive).not.toHaveBeenCalled();
  });

  it('requires reconnection when the stored Workspace scopes are incomplete', async () => {
    repo.findCredential.mockResolvedValue({
      status: 'CONNECTED',
      ciphertext: 'ciphertext',
      iv: 'iv',
      authTag: 'auth-tag',
      keyVersion: 'v1',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    repo.findActive.mockResolvedValue({ _id: 'old-registration' });

    const service = new CaptainService(repo as never, sheets);

    await expect(service.status(userId, sessionId)).resolves.toEqual({
      workspaceStatus: 'RECONNECT_REQUIRED',
      registration: null,
    });

    expect(repo.markCredentialReconnectRequired).toHaveBeenCalledWith(userId);
    expect(sheets.validateConnection).not.toHaveBeenCalled();
    expect(repo.findActive).not.toHaveBeenCalled();
  });

  it('requires reconnection when Google has revoked the stored refresh token', async () => {
    repo.findActive.mockResolvedValue({ _id: 'old-registration' });

    sheets.validateConnection.mockRejectedValue(
      new AppError(409, 'WORKSPACE_RECONNECT_REQUIRED', 'Reconnect Google Workspace to continue'),
    );

    const service = new CaptainService(repo as never, sheets);

    await expect(service.status(userId, sessionId)).resolves.toEqual({
      workspaceStatus: 'RECONNECT_REQUIRED',
      registration: null,
    });

    expect(repo.markCredentialReconnectRequired).toHaveBeenCalledWith(userId);
    expect(repo.findActive).not.toHaveBeenCalled();
  });

  it('loads the registration only after the Workspace connection is validated', async () => {
    const activeRegistration = {
      _id: 'registration',
      version: 1,
      spreadsheetUrl: sheetUrl,
      spreadsheetTitle: 'Cloned Attendance',
      department: 'CST',
      semester: '5th',
      shift: 'Morning',
      captainRoll: '007',
      subjects: [{ subjectCode: 'CSE-101', subjectName: 'Data Structures' }],
      parserVersion: 'captain-sheet-v1',
      structureFingerprint: 'fingerprint',
      health: 'READ_VERIFIED',
      writeScopeGranted: true,
      warnings: [],
      verifiedAt: new Date(0),
    };

    repo.findActive.mockResolvedValue(activeRegistration);

    const service = new CaptainService(repo as never, sheets);

    await expect(service.status(userId, sessionId)).resolves.toMatchObject({
      workspaceStatus: 'CONNECTED',
      registration: {
        id: 'registration',
        spreadsheetTitle: 'Cloned Attendance',
      },
    });

    expect(sheets.validateConnection).toHaveBeenCalledTimes(1);
    expect(repo.findActive).toHaveBeenCalledWith(userId);
    expect(repo.markCredentialReconnectRequired).not.toHaveBeenCalled();
  });

  it('requires a Workspace credential before any Sheet read', async () => {
    repo.findCredential.mockResolvedValue(null);
    const service = new CaptainService(repo as never, sheets);
    await expect(
      service.register(userId, sessionId, { sheetUrl, captainRoll: '007' }, 'request'),
    ).rejects.toMatchObject({ code: 'WORKSPACE_CONNECTION_REQUIRED' });
    expect(sheets.readSpreadsheet).not.toHaveBeenCalled();
  });

  it('returns a safe reconnect error for revoked or expired Workspace authorization', async () => {
    sheets.readSpreadsheet.mockRejectedValue(
      new AppError(409, 'WORKSPACE_RECONNECT_REQUIRED', 'Reconnect Google Workspace to continue'),
    );
    const service = new CaptainService(repo as never, sheets);
    await expect(
      service.register(userId, sessionId, { sheetUrl, captainRoll: '007' }, 'request'),
    ).rejects.toMatchObject({ code: 'WORKSPACE_RECONNECT_REQUIRED' });
    expect(repo.registerVersion).not.toHaveBeenCalled();
  });

  it('stores only minimal parsed registration data and keeps roster values transient', async () => {
    const service = new CaptainService(repo as never, sheets);
    const result = await service.register(
      userId,
      sessionId,
      { sheetUrl, captainRoll: '007' },
      'request',
    );
    expect(result.subjects).toEqual([{ subjectCode: 'CSE-101', subjectName: 'Data Structures' }]);
    const stored = repo.registerVersion.mock.calls[0]?.[1];
    expect(stored).toMatchObject({
      department: 'CST',
      semester: '5th',
      shift: 'Morning',
      captainRoll: '007',
      health: 'READ_VERIFIED',
      writeScopeGranted: true,
    });
    expect(JSON.stringify(stored)).not.toContain('Captain Name');
    expect(JSON.stringify(stored)).not.toContain('values');
  });

  it('derives a distinct deterministic idempotency key for each batch subject', async () => {
    repo.findActive.mockResolvedValue({
      _id: 'registration',
      health: 'READ_VERIFIED',
      subjects: [
        {
          subjectCode: '25811',
          subjectName: 'Social Science',
        },
        {
          subjectCode: '25922',
          subjectName: 'Physics II',
        },
      ],
    });

    const service = new CaptainService(repo as never, sheets);

    const submitAttendance = vi
      .spyOn(service, 'submitAttendance')
      .mockImplementation(async (_userId, _sessionId, input) => ({
        subject: {
          subjectCode: input.subjectCode,
          subjectName: input.subjectCode === '25811' ? 'Social Science' : 'Physics II',
        },
        date: input.date,
        total: 87,
        present: 2,
        absent: 85,
        status: 'WRITTEN',
      }));

    const batchKey = '00000000-0000-4000-8000-000000000010';

    const result = await service.submitAttendanceBatch(
      userId,
      sessionId,
      {
        subjectCodes: ['25811', '25922'],
        date: '2024-01-26',
        presentRolls: ['007', '008'],
        idempotencyKey: batchKey,
      },
      'request',
    );

    expect(submitAttendance).toHaveBeenNthCalledWith(
      1,
      userId,
      sessionId,
      {
        subjectCode: '25811',
        date: '2024-01-26',
        presentRolls: ['007', '008'],
        idempotencyKey: `${batchKey}:25811`,
      },
      'request',
    );

    expect(submitAttendance).toHaveBeenNthCalledWith(
      2,
      userId,
      sessionId,
      {
        subjectCode: '25922',
        date: '2024-01-26',
        presentRolls: ['007', '008'],
        idempotencyKey: `${batchKey}:25922`,
      },
      'request',
    );

    expect(result).toMatchObject({
      requestedSubjects: 2,
      writtenSubjects: 2,
      failedSubjects: 0,
      status: 'WRITTEN',
    });
  });
});
