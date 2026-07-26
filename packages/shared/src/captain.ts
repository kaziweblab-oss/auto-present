export interface CaptainSubject {
  subjectCode: string;
  subjectName: string;
}

export type CaptainRegistrationHealth = 'READ_VERIFIED' | 'DEGRADED' | 'INVALID';

export interface CaptainRegistrationView {
  id: string;
  version: number;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  department: string;
  semester: string;
  shift: string;
  captainRoll: string;
  subjects: CaptainSubject[];
  parserVersion: string;
  structureFingerprint: string;
  health: CaptainRegistrationHealth;
  writeScopeGranted: boolean;
  warnings: string[];
  verifiedAt: string;
}

export interface CaptainStatusResponse {
  workspaceStatus: 'NOT_CONNECTED' | 'CONNECTED' | 'RECONNECT_REQUIRED';
  registration: CaptainRegistrationView | null;
}

export interface CaptainRegistrationInput {
  sheetUrl: string;
  captainRoll: string;
}

export interface CaptainDashboardResponse {
  captain: {
    displayName: string;
    email: string;
  };
  registration: CaptainRegistrationView;
}

/**
 * Existing single-subject attendance contract.
 *
 * Keep this contract for backward compatibility until all API and web
 * consumers have migrated to CaptainAttendanceBatchInput.
 */
export interface CaptainAttendanceInput {
  subjectCode: string;
  date: string;
  presentRolls: string[];
  idempotencyKey: string;
}

export interface CaptainAttendanceSummary {
  subject: CaptainSubject;
  date: string;
  total: number;
  present: number;
  absent: number;
  status: 'WRITTEN';
}

/**
 * Multi-subject attendance request.
 *
 * The same attendance date and present-roll selection will be applied to
 * every selected subject.
 */

export interface CaptainValidRollsInput {
  subjectCodes: string[];
}

export interface CaptainValidRollsResponse {
  subjectCodes: string[];
  validRolls: string[];
  subjectRolls: Record<string, string[]>;
}

export interface CaptainAttendanceBatchInput {
  subjectCodes: string[];
  date: string;
  presentRolls: string[];
  idempotencyKey: string;
}

export type CaptainAttendanceBatchItemStatus = 'WRITTEN' | 'FAILED';

export interface CaptainAttendanceBatchItem {
  subject: CaptainSubject;
  date: string;
  total: number;
  present: number;
  absent: number;
  status: CaptainAttendanceBatchItemStatus;
  errorCode?: string;
  errorMessage?: string;
}

export interface CaptainAttendanceBatchSummary {
  date: string;
  requestedSubjects: number;
  writtenSubjects: number;
  failedSubjects: number;
  status: 'WRITTEN' | 'PARTIAL' | 'FAILED';
  results: CaptainAttendanceBatchItem[];
}
