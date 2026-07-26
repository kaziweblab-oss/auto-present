export type StudentIdentityStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'NOT_FOUND';

export type StudentAttendanceStatus = 'PRESENT' | 'ABSENT';

export interface StudentIdentityView {
  status: StudentIdentityStatus;
  roll: string | null;
}

export interface StudentSubject {
  subjectCode: string;
  subjectName: string;
}

export interface StudentAttendanceRecord {
  subjectCode: string;
  subjectName: string;
  date: string;
  status: StudentAttendanceStatus;
}

export interface StudentAttendanceSummary {
  subjectCode: string;
  subjectName: string;
  totalClasses: number;
  presentClasses: number;
  absentClasses: number;
  attendancePercentage: number;
}

export interface StudentStatusResponse {
  identity: StudentIdentityView;
  canViewAttendance: boolean;
}

export interface StudentDashboardResponse {
  student: {
    displayName: string;
    email: string;
    roll: string;
  };
  subjects: StudentSubject[];
  attendanceSummaries: StudentAttendanceSummary[];
}

export interface StudentAttendanceHistoryInput {
  subjectCode?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface StudentAttendanceHistoryResponse {
  records: StudentAttendanceRecord[];
}

export interface StudentRegistrationOption {
  department: string;
  departmentKey: string;
  semester: string;
  semesterKey: string;
  shift: string;
  shiftKey: string;
}

export interface StudentRegistrationOptionsResponse {
  options: StudentRegistrationOption[];
}
