import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../errors/app-error.js';
import { CaptainService } from './captain.service.js';
import { parseCaptainSheet } from './captain.parser.js';

function setup(writeFailure = false) {
  const values: unknown[][] = [
    ['Department', 'CST'],
    ['Semester', '5th'],
    ['Shift', 'Morning'],
    ['Name', 'Roll', '', 'Total'],
    ['Captain', '007', '', '=COUNTIF(C5:C5,"P")'],
    ['Student', '008', '', '=COUNTIF(C6:C6,"P")'],
  ];
  const snapshot = {
    spreadsheetId: 'sheet',
    title: 'Attendance',
    timeZone: 'Asia/Dhaka',
    sheets: [
      {
        sheetId: 42,
        title: 'CSE-101',
        hidden: false,
        rowCount: 100,
        columnCount: 10,
        values,
      },
    ],
  };
  const structureFingerprint = parseCaptainSheet(snapshot, '007').structureFingerprint;
  let receipt: Record<string, unknown> | null = null;
  const repository = {
    findCaptainSession: vi.fn().mockResolvedValue({ _id: 'session' }),
    findActive: vi.fn().mockResolvedValue({
      _id: 'registration',
      spreadsheetId: 'sheet',
      captainRoll: '007',
      structureFingerprint,
      health: 'READ_VERIFIED',
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
    }),
    findCredential: vi.fn().mockResolvedValue({ status: 'CONNECTED' }),
    findUser: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
    findAttendanceReceipt: vi.fn().mockImplementation(() => Promise.resolve(receipt)),
    createAttendanceReceipt: vi.fn().mockImplementation((data) => {
      if (receipt) return Promise.resolve(null);
      receipt = { _id: 'receipt', ...data };
      return Promise.resolve(receipt);
    }),
    retryAttendanceReceipt: vi.fn(),
    completeAttendanceReceipt: vi.fn().mockImplementation((_id, counts) => {
      receipt = { ...receipt, ...counts, status: 'SUCCESS' };
      return Promise.resolve(receipt);
    }),
    failAttendanceReceipt: vi.fn().mockImplementation((_id, failureCode) => {
      receipt = { ...receipt, status: 'FAILED', failureCode };
      return Promise.resolve(undefined);
    }),
    audit: vi.fn().mockResolvedValue(undefined),
    markActiveHealth: vi.fn().mockResolvedValue(undefined),
  };

  const gateway = {
    validateConnection: vi.fn().mockResolvedValue(undefined),

    readSpreadsheet: vi.fn().mockImplementation(() => Promise.resolve(snapshot)),

    writeAttendance: vi.fn().mockImplementation((_spreadsheetId, plan) => {
      if (writeFailure)
        return Promise.reject(
          new AppError(503, 'ATTENDANCE_WRITE_FAILED', 'Attendance write failed'),
        );

      values[plan.headerRow]![plan.attendanceColumn] = plan.displayDate;

      for (const item of plan.cells) {
        values[item.row]![plan.attendanceColumn] = item.value;
      }

      return Promise.resolve();
    }),
  };

  return {
    service: new CaptainService(repository as never, gateway),
    repository,
    gateway,
    snapshot,
    getReceipt: () => receipt,
  };
}

const request = (idempotencyKey: string) => ({
  subjectCode: 'CSE-101',
  date: '2024-01-02',
  presentRolls: ['007'],
  idempotencyKey,
});

describe('Captain attendance service', () => {
  it('serializes concurrent same-date submissions and writes at most once', async () => {
    const { service, gateway } = setup();
    const first = service.submitAttendance(
      'user',
      'session',
      request('00000000-0000-4000-8000-000000000001'),
      'request-1',
    );
    const second = service.submitAttendance(
      'user',
      'session',
      request('00000000-0000-4000-8000-000000000002'),
      'request-2',
    );
    const results = await Promise.allSettled([first, second]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(gateway.writeAttendance).toHaveBeenCalledTimes(1);
  });

  it('does not create a receipt while writing attendance', async () => {
    const { service, repository } = setup();
    const summary = await service.submitAttendance(
      'user',
      'session',
      request('00000000-0000-4000-8000-000000000003'),
      'request',
    );
    expect(summary).toMatchObject({ total: 2, present: 1, absent: 1, status: 'WRITTEN' });
    expect(repository.createAttendanceReceipt).not.toHaveBeenCalled();
    expect(repository.completeAttendanceReceipt).not.toHaveBeenCalled();
    expect(repository.failAttendanceReceipt).not.toHaveBeenCalled();
  });

  it('rejects an identical retry once the sheet already contains the date', async () => {
    const { service, gateway } = setup();
    const input = request('00000000-0000-4000-8000-000000000006');
    const first = await service.submitAttendance('user', 'session', input, 'request-1');
    await expect(
      service.submitAttendance('user', 'session', input, 'request-2'),
    ).rejects.toMatchObject({
      code: 'ATTENDANCE_DATE_ALREADY_EXISTS',
    });
    expect(first).toMatchObject({ status: 'WRITTEN' });
    expect(gateway.writeAttendance).toHaveBeenCalledTimes(1);
  });

  it('does not report success when the Google write fails', async () => {
    const { service, repository, gateway } = setup(true);
    await expect(
      service.submitAttendance(
        'user',
        'session',
        request('00000000-0000-4000-8000-000000000004'),
        'request',
      ),
    ).rejects.toMatchObject({ code: 'ATTENDANCE_WRITE_FAILED' });
    expect(gateway.writeAttendance).toHaveBeenCalledTimes(1);
    expect(repository.createAttendanceReceipt).not.toHaveBeenCalled();
    expect(repository.completeAttendanceReceipt).not.toHaveBeenCalled();
    expect(repository.failAttendanceReceipt).not.toHaveBeenCalled();
  });

  it('blocks writes and degrades registration when verified structure changed', async () => {
    const { service, repository, gateway, snapshot } = setup();
    snapshot.sheets[0]!.columnCount = 11;
    await expect(
      service.submitAttendance(
        'user',
        'session',
        request('00000000-0000-4000-8000-000000000005'),
        'request',
      ),
    ).rejects.toMatchObject({ code: 'REGISTRATION_STRUCTURE_CHANGED' });
    expect(gateway.writeAttendance).not.toHaveBeenCalled();
    expect(repository.markActiveHealth).toHaveBeenCalledWith('user', 'sheet', 'DEGRADED');
  });
});
