import { describe, expect, it } from 'vitest';
import {
  extractSubjectRoster,
  parseIsoCalendarDate,
  planAttendanceWrite,
} from './captain.attendance.js';
import { parseCaptainSheet, type SheetSnapshot } from './captain.parser.js';
import { tabReadRange } from './captain.safety.js';

function fixture(sheetId = 42): SheetSnapshot {
  const values: unknown[][] = Array.from({ length: 103 }, () => []);
  values[100] = [];
  values[100]![54] = 'Name';
  values[100]![55] = 'Roll';
  values[100]![60] = '01/01/2024';
  values[100]![62] = 'Total';
  values[101] = [];
  values[101]![54] = 'Captain';
  values[101]![55] = '007';
  values[101]![60] = 'P';
  values[101]![62] = '=COUNTIF(B102:B102,"P")';
  values[102] = [];
  values[102]![54] = 'Student';
  values[102]![55] = '008';
  values[102]![60] = 'A';
  values[102]![62] = '=COUNTIF(B103:B103,"P")';
  return {
    spreadsheetId: 'sheet',
    title: 'Attendance',
    timeZone: 'Asia/Dhaka',
    sheets: [
      {
        sheetId,
        title: 'CSE-101',
        hidden: false,
        rowCount: 200,
        columnCount: 70,
        values,
      },
    ],
  };
}

const subject = {
  subjectCode: 'CSE-101',
  subjectName: 'Data Structures',
  sheetId: 42,
  tabTitle: 'CSE-101',
  headerRow: 100,
  rollColumn: 55,
  presentMarker: 'P',
  absentMarker: 'A',
  dateFormat: 'DD/MM/YYYY',
};

describe('dynamic attendance planning', () => {
  it('derives a metadata-driven read range beyond AZ and row 80', () => {
    expect(tabReadRange("CSE '101'", 250, 70)).toBe("'CSE ''101'''!A1:BR250");
  });

  it('plans beyond AZ and row 80 without touching summary/formula columns', () => {
    const plan = planAttendanceWrite(
      fixture(),
      subject,
      '2024-01-02',
      ['007'],
      new Date(2024, 0, 3),
    );
    expect(plan).toMatchObject({
      headerRow: 100,
      attendanceColumn: 56,
      total: 2,
      present: 1,
      absent: 1,
      displayDate: '02/01/2024',
    });
    expect(plan.cells).toEqual([
      { row: 101, value: 'P' },
      { row: 102, value: 'A' },
    ]);
    expect(plan.attendanceColumn).toBeLessThan(62);
  });

  it('normalizes dates without UTC shifting and rejects impossible/future dates', () => {
    expect(parseIsoCalendarDate('2024-02-29', new Date(2024, 2, 1))).toBe('2024-02-29');
    expect(() => parseIsoCalendarDate('2024-02-30', new Date(2024, 2, 1))).toThrow();
    expect(() => parseIsoCalendarDate('2024-03-02', new Date(2024, 2, 1))).toThrowError(
      expect.objectContaining({ code: 'ATTENDANCE_DATE_FUTURE' }),
    );
  });

  it('rejects an existing date before producing any write plan', () => {
    expect(() =>
      planAttendanceWrite(fixture(), subject, '2024-01-01', ['007'], new Date(2024, 0, 3)),
    ).toThrowError(expect.objectContaining({ code: 'ATTENDANCE_DATE_ALREADY_EXISTS' }));
  });

  it('preserves leading-zero rolls and rejects unknown present rolls', () => {
    expect(
      planAttendanceWrite(fixture(), subject, '2024-01-02', ['007'], new Date(2024, 0, 3)).present,
    ).toBe(1);
    expect(() =>
      planAttendanceWrite(fixture(), subject, '2024-01-02', ['7'], new Date(2024, 0, 3)),
    ).toThrowError(expect.objectContaining({ code: 'ATTENDANCE_ROLL_UNKNOWN' }));
  });

  it('allows the same date on a different registered subject tab', () => {
    const otherSubject = {
      ...subject,
      subjectCode: 'MAT-201',
      subjectName: 'Mathematics',
      sheetId: 43,
      tabTitle: 'MAT-201',
    };
    const other = fixture(43);
    other.sheets[0]!.title = 'MAT-201';
    expect(
      planAttendanceWrite(other, otherSubject, '2024-01-02', [], new Date(2024, 0, 3)).date,
    ).toBe('2024-01-02');
  });

  it('fails on forged/changed tab identity and explicit safety-cap overflow', () => {
    expect(() =>
      planAttendanceWrite(fixture(99), subject, '2024-01-02', [], new Date(2024, 0, 3)),
    ).toThrowError(expect.objectContaining({ code: 'REGISTRATION_STRUCTURE_CHANGED' }));
    expect(() =>
      parseCaptainSheet(
        {
          spreadsheetId: 'sheet',
          title: 'Too large',
          sheets: [
            {
              sheetId: 1,
              title: 'CSE-101',
              hidden: false,
              rowCount: 2_001,
              columnCount: 10,
              values: [],
            },
          ],
        },
        '007',
      ),
    ).toThrowError(expect.objectContaining({ code: 'SHEET_TOO_LARGE' }));
  });

  it('fails safely when the planned target cells are merged or protected', () => {
    const protectedSheet = fixture();
    protectedSheet.sheets[0]!.protectedRanges = [
      {
        startRowIndex: 100,
        endRowIndex: 103,
        startColumnIndex: 56,
        endColumnIndex: 57,
      },
    ];

    expect(() =>
      planAttendanceWrite(protectedSheet, subject, '2024-01-02', ['007'], new Date(2024, 0, 3)),
    ).toThrowError(expect.objectContaining({ code: 'ATTENDANCE_STRUCTURE_UNSUPPORTED' }));
  });

  it('extracts normalized valid rolls while preserving leading zeros', () => {
    expect(extractSubjectRoster(fixture(), subject)).toEqual({
      subjectCode: 'CSE-101',
      rolls: ['007', '008'],
    });
  });

  it('rejects duplicate rolls while extracting a subject roster', () => {
    const snapshot = fixture();

    snapshot.sheets[0]!.values[102]![55] = '007';

    expect(() => extractSubjectRoster(snapshot, subject)).toThrowError(
      expect.objectContaining({
        code: 'ROSTER_ROLL_DUPLICATE',
      }),
    );
  });
});
