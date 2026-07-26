/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call -- Repository records are mapped to explicit public views. */
import type {
  CaptainAttendanceBatchInput,
  CaptainAttendanceBatchItem,
  CaptainAttendanceBatchSummary,
  CaptainAttendanceInput,
  CaptainAttendanceSummary,
  CaptainDashboardResponse,
  CaptainRegistrationInput,
  CaptainRegistrationView,
  CaptainStatusResponse,
  CaptainSubject,
  CaptainValidRollsInput,
  CaptainValidRollsResponse,
} from '@auto-present/shared';
import { AppError } from '../../errors/app-error.js';
import { WORKSPACE_SCOPES } from '../auth/auth.service.js';
import { GoogleCaptainSheetReader, type CaptainSheetReader } from './captain.google.js';
import {
  extractSubjectRoster,
  normalizeSheetDate,
  planAttendanceWrite,
  type StoredSubjectStructure,
} from './captain.attendance.js';
import { withAttendanceLock } from './captain.lock.js';
import {
  CAPTAIN_PARSER_VERSION,
  canonicalSheetUrl,
  extractSpreadsheetId,
  parseCaptainSheet,
} from './captain.parser.js';
import { CaptainRepository } from './captain.repository.js';

function identityKey(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

function batchItemIdempotencyKey(batchKey: string, subjectCode: string): string {
  return `${batchKey}:${subjectCode}`;
}

function view(record: any): CaptainRegistrationView {
  return {
    id: String(record._id),
    version: Number(record.version),
    spreadsheetUrl: record.spreadsheetUrl,
    spreadsheetTitle: record.spreadsheetTitle,
    department: record.department,
    semester: record.semester,
    shift: record.shift,
    captainRoll: record.captainRoll,
    subjects: record.subjects.map((subject: any) => ({
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
    })),
    parserVersion: record.parserVersion,
    structureFingerprint: record.structureFingerprint,
    health: record.health,
    writeScopeGranted: record.writeScopeGranted,
    warnings: [...(record.warnings ?? [])],
    verifiedAt: new Date(record.verifiedAt).toISOString(),
  };
}

export class CaptainService {
  constructor(
    private readonly repository = new CaptainRepository(),
    private readonly sheetReader: CaptainSheetReader = new GoogleCaptainSheetReader(),
  ) {}

  private async authorizeCaptain(userId: string, sessionId: string) {
    const session = await this.repository.findCaptainSession(userId, sessionId);
    if (!session)
      throw new AppError(403, 'CAPTAIN_ACCESS_DENIED', 'Authenticated Captain access is required');
    const user = await this.repository.findUser(userId);
    if (!user || user.status !== 'ACTIVE')
      throw new AppError(401, 'ACCOUNT_SUSPENDED', 'Account is not active');
  }

  async status(userId: string, sessionId: string): Promise<CaptainStatusResponse> {
    await this.authorizeCaptain(userId, sessionId);

    const credential = await this.repository.findCredential(userId);

    if (!credential) {
      return {
        workspaceStatus: 'NOT_CONNECTED',
        registration: null,
      };
    }

    if (credential.status !== 'CONNECTED') {
      return {
        workspaceStatus: 'RECONNECT_REQUIRED',
        registration: null,
      };
    }

    const grantedScopes = new Set<string>(credential.scopes ?? []);
    const hasRequiredScopes = WORKSPACE_SCOPES.every((scope) => grantedScopes.has(scope));

    if (!hasRequiredScopes) {
      await this.repository.markCredentialReconnectRequired(userId);

      return {
        workspaceStatus: 'RECONNECT_REQUIRED',
        registration: null,
      };
    }

    try {
      await this.sheetReader.validateConnection(credential);
    } catch (error) {
      if (
        error instanceof AppError &&
        ['WORKSPACE_RECONNECT_REQUIRED', 'WORKSPACE_CONNECTION_REQUIRED'].includes(error.code)
      ) {
        await this.repository.markCredentialReconnectRequired(userId);

        return {
          workspaceStatus: 'RECONNECT_REQUIRED',
          registration: null,
        };
      }

      throw error;
    }

    const registration = await this.repository.findActive(userId);

    return {
      workspaceStatus: 'CONNECTED',
      registration: registration ? view(registration) : null,
    };
  }

  async register(
    userId: string,
    sessionId: string,
    input: CaptainRegistrationInput,
    requestId: string,
  ): Promise<CaptainRegistrationView> {
    await this.authorizeCaptain(userId, sessionId);
    let attemptedSpreadsheetId: string | null = null;
    try {
      const spreadsheetId = extractSpreadsheetId(input.sheetUrl);
      attemptedSpreadsheetId = spreadsheetId;
      const credential = await this.repository.findCredential(userId);
      if (!credential)
        throw new AppError(
          409,
          'WORKSPACE_CONNECTION_REQUIRED',
          'Connect Google Workspace to continue',
        );
      const parsed = parseCaptainSheet(
        await this.sheetReader.readSpreadsheet(spreadsheetId, credential),
        input.captainRoll,
      );
      const stored = await this.repository.registerVersion(userId, {
        spreadsheetId,
        spreadsheetUrl: canonicalSheetUrl(spreadsheetId),
        spreadsheetTitle: parsed.spreadsheetTitle,
        department: parsed.department,
        departmentKey: identityKey(parsed.department),
        semester: parsed.semester,
        semesterKey: identityKey(parsed.semester),
        shift: parsed.shift,
        shiftKey: identityKey(parsed.shift),
        captainRoll: input.captainRoll.trim(),
        subjects: parsed.subjects,
        parserVersion: CAPTAIN_PARSER_VERSION,
        structureFingerprint: parsed.structureFingerprint,
        health: 'READ_VERIFIED',
        writeScopeGranted: (credential.scopes ?? []).includes(WORKSPACE_SCOPES[0]),
        warnings: parsed.warnings,
        active: true,
        verifiedAt: new Date(),
        lastSuccessfulSyncAt: new Date(),
      });
      await this.repository.audit({
        actorUserId: userId,
        sessionId,
        event: 'CAPTAIN_SHEET_REGISTERED',
        outcome: 'SUCCESS',
        metadata: {
          subjectCount: parsed.subjects.length,
          parserVersion: CAPTAIN_PARSER_VERSION,
          warningCount: parsed.warnings.length,
        },
        requestId,
        occurredAt: new Date(),
      });
      await this.repository.addUserRole(userId, 'STUDENT');
      return view(stored);
    } catch (error) {
      if (
        attemptedSpreadsheetId &&
        error instanceof AppError &&
        [
          'SHEET_STRUCTURE_UNSUPPORTED',
          'NO_VALID_SUBJECT_TABS',
          'CLASS_METADATA_INCONSISTENT',
          'SUBJECT_CODE_CONFLICT',
          'CAPTAIN_ROLL_DUPLICATE',
        ].includes(error.code)
      )
        await this.repository.markActiveHealth(
          userId,
          attemptedSpreadsheetId,
          error.code === 'SHEET_STRUCTURE_UNSUPPORTED' ? 'DEGRADED' : 'INVALID',
        );
      await this.repository.audit({
        actorUserId: userId,
        sessionId,
        event: 'CAPTAIN_SHEET_REGISTRATION_FAILED',
        outcome: 'FAILURE',
        metadata: {
          code: error instanceof AppError ? error.code : 'CAPTAIN_REGISTRATION_FAILED',
        },
        requestId,
        occurredAt: new Date(),
      });
      throw error;
    }
  }

  async dashboard(userId: string, sessionId: string): Promise<CaptainDashboardResponse> {
    await this.authorizeCaptain(userId, sessionId);
    const [user, registration] = await Promise.all([
      this.repository.findUser(userId),
      this.repository.findActive(userId),
    ]);
    if (!user) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (!registration)
      throw new AppError(
        409,
        'CAPTAIN_REGISTRATION_REQUIRED',
        'Captain Sheet verification is required',
      );
    return {
      captain: { displayName: user.displayName, email: user.email },
      registration: view(registration),
    };
  }

  async getValidAttendanceRolls(
    userId: string,
    sessionId: string,
    input: CaptainValidRollsInput,
  ): Promise<CaptainValidRollsResponse> {
    await this.authorizeCaptain(userId, sessionId);

    const registration = await this.repository.findActive(userId);

    if (!registration || registration.health !== 'READ_VERIFIED') {
      throw new AppError(
        409,
        'CAPTAIN_REGISTRATION_REVERIFY_REQUIRED',
        'Verify the active Captain registration before submitting attendance',
      );
    }

    const credential = await this.repository.findCredential(userId);

    if (!credential) {
      throw new AppError(
        409,
        'WORKSPACE_CONNECTION_REQUIRED',
        'Connect Google Workspace to continue',
      );
    }

    const registeredSubjects = new Map<string, StoredSubjectStructure>(
      registration.subjects.map((subject: any): [string, StoredSubjectStructure] => [
        subject.subjectCode,
        {
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          sheetId: subject.sheetId,
          tabTitle: subject.tabTitle,
          headerRow: subject.headerRow,
          rollColumn: subject.rollColumn,
          presentMarker: subject.presentMarker,
          absentMarker: subject.absentMarker,
          dateFormat: subject.dateFormat,
        },
      ]),
    );

    const invalidSubjectCodes = input.subjectCodes.filter(
      (subjectCode) => !registeredSubjects.has(subjectCode),
    );

    if (invalidSubjectCodes.length > 0) {
      throw new AppError(
        400,
        'CAPTAIN_SUBJECT_INVALID',
        `Invalid subject codes: ${invalidSubjectCodes.join(', ')}`,
      );
    }

    const snapshot = await this.sheetReader.readSpreadsheet(registration.spreadsheetId, credential);

    const currentStructure = parseCaptainSheet(snapshot, registration.captainRoll);

    if (currentStructure.structureFingerprint !== registration.structureFingerprint) {
      await this.repository.markActiveHealth(userId, registration.spreadsheetId, 'DEGRADED');

      throw new AppError(
        409,
        'REGISTRATION_STRUCTURE_CHANGED',
        'The verified Sheet structure changed; verify it again',
      );
    }

    const subjectRolls: Record<string, string[]> = {};

    for (const subjectCode of input.subjectCodes) {
      const subject = registeredSubjects.get(subjectCode);

      if (!subject) {
        throw new AppError(400, 'CAPTAIN_SUBJECT_INVALID', 'Selected subject is not registered');
      }

      const roster = extractSubjectRoster(snapshot, subject);

      subjectRolls[subjectCode] = roster.rolls;
    }

    const [firstSubjectCode, ...remainingSubjectCodes] = input.subjectCodes;

    const firstRolls = firstSubjectCode ? (subjectRolls[firstSubjectCode] ?? []) : [];

    const validRolls = remainingSubjectCodes.reduce((commonRolls, subjectCode) => {
      const currentRolls = new Set(subjectRolls[subjectCode] ?? []);

      return commonRolls.filter((roll) => currentRolls.has(roll));
    }, firstRolls);

    return {
      subjectCodes: input.subjectCodes,
      validRolls,
      subjectRolls,
    };
  }

  async submitAttendance(
    userId: string,
    sessionId: string,
    input: CaptainAttendanceInput,
    requestId: string,
  ): Promise<CaptainAttendanceSummary> {
    await this.authorizeCaptain(userId, sessionId);
    const registration = await this.repository.findActive(userId);
    if (!registration || registration.health !== 'READ_VERIFIED')
      throw new AppError(
        409,
        'CAPTAIN_REGISTRATION_REVERIFY_REQUIRED',
        'Verify the active Captain registration before submitting attendance',
      );
    const subject = registration.subjects.find(
      (item: any) => item.subjectCode === input.subjectCode,
    );
    if (!subject) throw new AppError(400, 'CAPTAIN_SUBJECT_INVALID', 'Select a registered subject');
    const credential = await this.repository.findCredential(userId);
    if (!credential)
      throw new AppError(
        409,
        'WORKSPACE_CONNECTION_REQUIRED',
        'Connect Google Workspace to continue',
      );
    if (!this.sheetReader.writeAttendance)
      throw new AppError(503, 'ATTENDANCE_WRITE_FAILED', 'Attendance writing is unavailable');

    const lockKey = `${registration._id}:${subject.sheetId}:${input.date}`;
    return withAttendanceLock(lockKey, async () => {
      const snapshot = await this.sheetReader.readSpreadsheet(
        registration.spreadsheetId,
        credential,
      );
      const currentStructure = parseCaptainSheet(snapshot, registration.captainRoll);
      if (currentStructure.structureFingerprint !== registration.structureFingerprint) {
        await this.repository.markActiveHealth(userId, registration.spreadsheetId, 'DEGRADED');
        throw new AppError(
          409,
          'REGISTRATION_STRUCTURE_CHANGED',
          'The verified Sheet structure changed; verify it again',
        );
      }
      const plan = planAttendanceWrite(snapshot, subject, input.date, input.presentRolls);
      try {
        await this.sheetReader.writeAttendance!(registration.spreadsheetId, plan, credential);
        const verified = await this.sheetReader.readSpreadsheet(
          registration.spreadsheetId,
          credential,
        );
        const verifiedTab = verified.sheets.find((item) => item.sheetId === subject.sheetId);
        if (
          !verifiedTab ||
          normalizeSheetDate(verifiedTab.values[plan.headerRow]?.[plan.attendanceColumn]) !==
            plan.date ||
          plan.cells.some((item) => {
            const value = verifiedTab.values[item.row]?.[plan.attendanceColumn];
            return (
              (typeof value === 'string' || typeof value === 'number'
                ? String(value).trim()
                : '') !== item.value
            );
          })
        )
          throw new AppError(
            503,
            'ATTENDANCE_WRITE_UNVERIFIED',
            'Attendance write could not be verified',
          );
        await this.repository.audit({
          actorUserId: userId,
          sessionId,
          event: 'CAPTAIN_ATTENDANCE_WRITTEN',
          outcome: 'SUCCESS',
          metadata: {
            subjectCode: subject.subjectCode,
            date: plan.date,
            total: plan.total,
            present: plan.present,
            absent: plan.absent,
          },
          requestId,
          occurredAt: new Date(),
        });
        return {
          subject: {
            subjectCode: subject.subjectCode,
            subjectName: subject.subjectName,
          },
          date: plan.date,
          total: plan.total,
          present: plan.present,
          absent: plan.absent,
          status: 'WRITTEN',
        };
      } catch (error) {
        throw error instanceof AppError
          ? error
          : new AppError(503, 'ATTENDANCE_WRITE_FAILED', 'Attendance could not be written safely');
      }
    });
  }

  async submitAttendanceBatch(
    userId: string,
    sessionId: string,
    input: CaptainAttendanceBatchInput,
    requestId: string,
  ): Promise<CaptainAttendanceBatchSummary> {
    await this.authorizeCaptain(userId, sessionId);

    const registration = await this.repository.findActive(userId);

    if (!registration || registration.health !== 'READ_VERIFIED') {
      throw new AppError(
        409,
        'CAPTAIN_REGISTRATION_REVERIFY_REQUIRED',
        'Verify the active Captain registration before submitting attendance',
      );
    }

    const registeredSubjects = new Map<string, CaptainSubject>(
      registration.subjects.map((subject: any): [string, CaptainSubject] => [
        subject.subjectCode,
        {
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
        },
      ]),
    );

    const invalidSubjectCodes = input.subjectCodes.filter(
      (subjectCode) => !registeredSubjects.has(subjectCode),
    );

    if (invalidSubjectCodes.length > 0) {
      throw new AppError(
        400,
        'CAPTAIN_SUBJECT_INVALID',
        `Invalid subject codes: ${invalidSubjectCodes.join(', ')}`,
      );
    }

    const results: CaptainAttendanceBatchItem[] = [];

    for (const subjectCode of input.subjectCodes) {
      const subject = registeredSubjects.get(subjectCode);

      if (!subject) {
        throw new AppError(400, 'CAPTAIN_SUBJECT_INVALID', 'Selected subject is not registered');
      }

      try {
        const summary = await this.submitAttendance(
          userId,
          sessionId,
          {
            subjectCode,
            date: input.date,
            presentRolls: input.presentRolls,
            idempotencyKey: batchItemIdempotencyKey(input.idempotencyKey, subjectCode),
          },
          requestId,
        );

        results.push({
          ...summary,
          status: 'WRITTEN',
        });
      } catch (error) {
        results.push({
          subject,
          date: input.date,
          total: 0,
          present: 0,
          absent: 0,
          status: 'FAILED',
          errorCode: error instanceof AppError ? error.code : 'ATTENDANCE_WRITE_FAILED',
          errorMessage:
            error instanceof AppError ? error.message : 'Attendance could not be written safely',
        });
      }
    }

    const writtenSubjects = results.filter((result) => result.status === 'WRITTEN').length;

    const failedSubjects = results.length - writtenSubjects;

    const status: CaptainAttendanceBatchSummary['status'] =
      failedSubjects === 0 ? 'WRITTEN' : writtenSubjects === 0 ? 'FAILED' : 'PARTIAL';

    await this.repository.audit({
      actorUserId: userId,
      sessionId,
      event: 'CAPTAIN_ATTENDANCE_BATCH_COMPLETED',
      outcome: failedSubjects === 0 ? 'SUCCESS' : 'FAILURE',
      metadata: {
        date: input.date,
        requestedSubjects: input.subjectCodes.length,
        writtenSubjects,
        failedSubjects,
        subjectCodes: input.subjectCodes,
      },
      requestId,
      occurredAt: new Date(),
    });

    return {
      date: input.date,
      requestedSubjects: input.subjectCodes.length,
      writtenSubjects,
      failedSubjects,
      status,
      results,
    };
  }
}
