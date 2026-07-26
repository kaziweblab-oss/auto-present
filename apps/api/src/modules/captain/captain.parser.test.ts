import { describe, expect, it } from 'vitest';
import { extractSpreadsheetId, parseCaptainSheet, type SheetSnapshot } from './captain.parser.js';

const spreadsheetId = '1abcdefghijklmnopqrstuvwxyzABCDE';

function subject(
  title = 'CSE-101',
  rows: unknown[][] = [
    ['Department', 'Computer Science'],
    ['Semester', '5th'],
    ['Shift', 'Morning'],
    ['Subject Name', 'Data Structures'],
    [],
    ['S/N', '', 'Name', 'Roll', 'Present', 'Total'],
    [1, '', 'Captain', '007', 0, 0],
  ],
) {
  return { title, hidden: false, values: rows };
}

function snapshot(sheets = [subject()]): SheetSnapshot {
  return { spreadsheetId, title: 'Cloned Attendance', sheets };
}

describe('Captain Sheet parser', () => {
  it('accepts only supported Google Sheets URLs and preserves the opaque ID', () => {
    expect(
      extractSpreadsheetId(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=123#gid=123`,
      ),
    ).toBe(spreadsheetId);
    for (const value of [
      `https://evil.example/spreadsheets/d/${spreadsheetId}`,
      `http://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      'https://docs.google.com/document/d/not-a-sheet',
      'not-a-url',
    ])
      expect(() => extractSpreadsheetId(value)).toThrowError(
        expect.objectContaining({ code: 'SHEET_URL_INVALID' }),
      );
  });

  it('detects moved roll columns, blank rows, metadata, and subjects dynamically', () => {
    const parsed = parseCaptainSheet(snapshot(), '007');
    expect(parsed).toMatchObject({
      department: 'Computer Science',
      semester: '5th',
      shift: 'Morning',
      subjects: [{ subjectCode: 'CSE-101', subjectName: 'Data Structures' }],
    });
    expect(parsed.structureFingerprint).toHaveLength(64);
  });

  it('skips irrelevant and hidden tabs with safe diagnostics', () => {
    const parsed = parseCaptainSheet(
      snapshot([
        { title: 'Instructions', hidden: false, values: [['Welcome']] },
        { title: 'Hidden', hidden: true, values: [] },
        subject(),
      ]),
      '007',
    );
    expect(parsed.warnings).toEqual(['IRRELEVANT_TAB_SKIPPED', 'HIDDEN_TAB_SKIPPED']);
  });

  it('rejects absent and duplicate Captain rolls without returning roster content', () => {
    expect(() => parseCaptainSheet(snapshot(), '999')).toThrowError(
      expect.objectContaining({
        code: 'CAPTAIN_ROLL_NOT_FOUND',
        message: 'You are not a student in this class',
      }),
    );
    const duplicate = subject();
    duplicate.values.push([2, '', 'Other', '007']);
    expect(() => parseCaptainSheet(snapshot([duplicate]), '007')).toThrowError(
      expect.objectContaining({ code: 'CAPTAIN_ROLL_DUPLICATE' }),
    );
  });

  it('rejects conflicting subject names and inconsistent class metadata', () => {
    const renamed = subject('CSE-101', [
      ['Department', 'Computer Science'],
      ['Semester', '5th'],
      ['Shift', 'Morning'],
      ['Subject Name', 'Algorithms'],
      ['Roll'],
      ['007'],
    ]);
    expect(() => parseCaptainSheet(snapshot([subject(), renamed]), '007')).toThrowError(
      expect.objectContaining({ code: 'SUBJECT_CODE_CONFLICT' }),
    );
    const otherShift = subject('MAT-201', [
      ['Department', 'Computer Science'],
      ['Semester', '5th'],
      ['Shift', 'Evening'],
      ['Subject Name', 'Mathematics'],
      ['Roll'],
      ['007'],
    ]);
    expect(() => parseCaptainSheet(snapshot([subject(), otherShift]), '007')).toThrowError(
      expect.objectContaining({ code: 'CLASS_METADATA_INCONSISTENT' }),
    );
  });

  it('fingerprints structure rather than student content', () => {
    const first = parseCaptainSheet(snapshot(), '007');
    const changedName = subject();
    changedName.values[6]![2] = 'A different transient name';
    const second = parseCaptainSheet(snapshot([changedName]), '007');
    expect(first.structureFingerprint).toBe(second.structureFingerprint);
    expect(JSON.stringify(second)).not.toContain('different transient name');
  });

  it('reads far-right merged anchors and separates semester/shift from one combined line', () => {
    const farRightSubject = (
      sheetId: number,
      title: string,
      subjectName: string,
      teacher: string,
    ) => {
      const rows: unknown[][] = Array.from({ length: 10 }, () => []);
      rows[0]![110] = 'Computer Science & Technology';
      rows[1]![115] = '5th Semester 1st Shift';
      rows[2]![120] = 'Subject Name';
      rows[2]![121] = subjectName;
      rows[3]![118] = 'Teacher';
      rows[3]![119] = teacher;
      rows[7]![99] = 'Name';
      rows[7]![100] = 'Roll';
      rows[8]![99] = 'Captain';
      rows[8]![100] = '007';
      return {
        sheetId,
        title,
        hidden: false,
        rowCount: 20,
        columnCount: 130,
        merges: [
          {
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 110,
            endColumnIndex: 118,
          },
        ],
        values: rows,
      };
    };
    const parsed = parseCaptainSheet(
      {
        spreadsheetId,
        title: 'Attendance — 5th Semester — 1st Shift',
        sheets: [
          farRightSubject(10, 'CSE-101', 'Data Structures', 'Teacher One'),
          farRightSubject(11, 'MAT-201', 'Mathematics', 'Teacher Two'),
        ],
      },
      '007',
    );
    expect(parsed).toMatchObject({
      department: 'Computer Science & Technology',
      semester: '5th',
      shift: '1st',
      subjects: [
        { subjectCode: 'CSE-101', subjectName: 'Data Structures' },
        { subjectCode: 'MAT-201', subjectName: 'Mathematics' },
      ],
    });
  });

  it('prefers explicit class labels over conflicting spreadsheet-title fallback', () => {
    const parsed = parseCaptainSheet(
      {
        ...snapshot(),
        title: 'Attendance — 8th Semester — 2nd Shift',
      },
      '007',
    );
    expect(parsed.semester).toBe('5th');
    expect(parsed.shift).toBe('Morning');
  });

  it('rejects ambiguous unlabeled departments with safe field-only diagnostics', () => {
    const rows: unknown[][] = Array.from({ length: 6 }, () => []);
    rows[0]![80] = 'First Possible Department';
    rows[1]![90] = '5th Semester 1st Shift';
    rows[2]![100] = 'Second Possible Department';
    rows[4]![95] = 'Name';
    rows[4]![96] = 'Roll';
    rows[5]![95] = 'Private Student Name';
    rows[5]![96] = '007';
    try {
      parseCaptainSheet(
        {
          spreadsheetId,
          title: 'Attendance',
          sheets: [
            {
              sheetId: 1,
              title: 'CSE-101',
              hidden: false,
              rowCount: 10,
              columnCount: 110,
              values: rows,
            },
          ],
        },
        '007',
      );
      throw new Error('Expected parser rejection');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'SHEET_STRUCTURE_UNSUPPORTED',
        details: [{ field: 'department', message: 'department metadata is ambiguous' }],
      });
      expect(JSON.stringify(error)).not.toContain('Private Student Name');
      expect(JSON.stringify(error)).not.toContain('First Possible Department');
    }
  });
});
