import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuditEventModel,
  AuthSessionModel,
  GoogleCredentialModel,
  UserModel,
} from '../auth/auth.models.js';
import { AttendanceWriteReceiptModel, ClassSheetRegistrationModel } from './captain.models.js';
import { CaptainService } from './captain.service.js';

const TEST_URI = 'mongodb://127.0.0.1:27017/auto-present_test';
const sheetUrl = 'https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxyzABCDE/edit';

function assertSafeTestDatabase(uri: string): void {
  if (process.env.NODE_ENV !== 'test') throw new Error('Integration tests require NODE_ENV=test');
  const parsed = new URL(uri);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname))
    throw new Error('Integration database must be local');
  if (!parsed.pathname.slice(1).endsWith('_test'))
    throw new Error('Refusing unsafe integration database');
}

function snapshot(code = 'CSE-101', name = 'Data Structures') {
  return {
    spreadsheetId: '1abcdefghijklmnopqrstuvwxyzABCDE',
    title: 'Cloned Attendance',
    sheets: [
      {
        title: code,
        hidden: false,
        values: [
          ['Department', 'CST'],
          ['Semester', '5th'],
          ['Shift', 'Morning'],
          ['Subject Name', name],
          ['Name', 'Roll'],
          ['Transient Captain Name', '007'],
          ['Another Student', '008'],
        ],
      },
    ],
  };
}

async function captainSession(role: 'CAPTAIN' | 'STUDENT' = 'CAPTAIN') {
  const user = await UserModel.create({
    googleSubject: randomUUID(),
    email: `${randomUUID()}@example.test`,
    displayName: 'Captain',
    emailVerified: true,
    roles: [],
    status: 'ACTIVE',
  });
  const session = await AuthSessionModel.create({
    userId: user._id,
    requestedRole: role,
    familyId: randomUUID(),
    tokenHash: randomUUID(),
    previousTokenHashes: [],
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  });
  await GoogleCredentialModel.create({
    userId: user._id,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    status: 'CONNECTED',
  });
  return { user, session };
}

describe('Captain registration persistence', () => {
  beforeAll(async () => {
    assertSafeTestDatabase(TEST_URI);
    await mongoose.connect(TEST_URI);
    await ClassSheetRegistrationModel.init();
    await AttendanceWriteReceiptModel.init();
  });
  beforeEach(async () => {
    await Promise.all([
      ClassSheetRegistrationModel.deleteMany({}),
      AttendanceWriteReceiptModel.deleteMany({}),
      AuthSessionModel.deleteMany({}),
      GoogleCredentialModel.deleteMany({}),
      UserModel.deleteMany({}),
      AuditEventModel.deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('rejects a Student session even when a Workspace credential exists', async () => {
    const { user, session } = await captainSession('STUDENT');
    const service = new CaptainService(undefined, {
      validateConnection: vi.fn().mockResolvedValue(undefined),
      readSpreadsheet: vi.fn(),
    });
    await expect(service.status(String(user._id), String(session._id))).rejects.toMatchObject({
      code: 'CAPTAIN_ACCESS_DENIED',
    });
  });

  it('is idempotent, then archives and versions a structurally changed registration', async () => {
    const { user, session } = await captainSession();
    const readSpreadsheet = vi
      .fn()
      .mockResolvedValueOnce(snapshot())
      .mockResolvedValueOnce(snapshot())
      .mockResolvedValueOnce(snapshot('MAT-201', 'Mathematics'));
    const service = new CaptainService(undefined, {
      validateConnection: vi.fn().mockResolvedValue(undefined),
      readSpreadsheet,
    });
    const input = { sheetUrl, captainRoll: '007' };
    const first = await service.register(String(user._id), String(session._id), input, 'request-1');
    const repeated = await service.register(
      String(user._id),
      String(session._id),
      input,
      'request-2',
    );
    const changed = await service.register(
      String(user._id),
      String(session._id),
      input,
      'request-3',
    );
    expect(repeated.id).toBe(first.id);
    expect(changed.version).toBe(2);
    expect(await ClassSheetRegistrationModel.countDocuments({})).toBe(2);
    expect(await ClassSheetRegistrationModel.countDocuments({ active: true })).toBe(1);
    expect(await ClassSheetRegistrationModel.countDocuments({ active: false })).toBe(1);
  });

  it('isolates ownership and persists no roster, names, or raw Sheet values', async () => {
    const owner = await captainSession();
    const other = await captainSession();

    const service = new CaptainService(undefined, {
      validateConnection: vi.fn().mockResolvedValue(undefined),
      readSpreadsheet: vi.fn().mockResolvedValue(snapshot()),
    });

    await service.register(
      String(owner.user._id),
      String(owner.session._id),
      { sheetUrl, captainRoll: '007' },
      'request',
    );
    const dashboard = await service.dashboard(String(owner.user._id), String(owner.session._id));
    expect(dashboard.registration.subjects).toEqual([
      { subjectCode: 'CSE-101', subjectName: 'Data Structures' },
    ]);
    await expect(
      service.dashboard(String(other.user._id), String(other.session._id)),
    ).rejects.toMatchObject({ code: 'CAPTAIN_REGISTRATION_REQUIRED' });
    const raw = JSON.stringify(await ClassSheetRegistrationModel.findOne().lean());
    expect(raw).not.toContain('Transient Captain Name');
    expect(raw).not.toContain('Another Student');
    expect(raw).not.toContain('008');
    expect(raw).not.toContain('values');
  });

  it('enforces one receipt per registration, subject tab, and date without roster data', async () => {
    const { user } = await captainSession();
    const registration = await ClassSheetRegistrationModel.create({
      captainUserId: user._id,
      spreadsheetId: 'sheet',
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/sheet',
      spreadsheetTitle: 'Clone',
      department: 'CST',
      departmentKey: 'cst',
      semester: '5th',
      semesterKey: '5th',
      shift: 'Morning',
      shiftKey: 'morning',
      captainRoll: '007',
      subjects: [
        {
          subjectCode: 'CSE-101',
          subjectName: 'Data Structures',
          sheetId: 42,
          tabTitle: 'CSE-101',
          headerRow: 3,
          rollColumn: 1,
          presentMarker: 'P',
          absentMarker: 'A',
          dateFormat: 'DD/MM/YYYY',
        },
      ],
      parserVersion: 'captain-sheet-v1',
      structureFingerprint: 'fingerprint',
      health: 'READ_VERIFIED',
      writeScopeGranted: true,
      warnings: [],
      version: 1,
      active: true,
      verifiedAt: new Date(),
    });
    const base = {
      captainUserId: user._id,
      registrationId: registration._id,
      subjectCode: 'CSE-101',
      date: '2024-01-02',
      status: 'PENDING',
    };
    await AttendanceWriteReceiptModel.create({
      ...base,
      sheetId: 42,
      idempotencyKey: randomUUID(),
    });
    await expect(
      AttendanceWriteReceiptModel.create({
        ...base,
        sheetId: 42,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 11_000 });
    await AttendanceWriteReceiptModel.create({
      ...base,
      sheetId: 43,
      subjectCode: 'MAT-201',
      idempotencyKey: randomUUID(),
    });
    const raw = JSON.stringify(await AttendanceWriteReceiptModel.find({}).lean());
    expect(raw).not.toContain('studentName');
    expect(raw).not.toContain('presentRolls');
    expect(await AttendanceWriteReceiptModel.countDocuments({})).toBe(2);
  });
});
