export interface AuthState {
  user: any | null;
  isLoggedIn: boolean;
  token: string | null;
  sheetID: string;
  subjectCodes: object | null;
}

export interface DashboardProps {
  sheetId: string;
  token: string;
  subjectCodes: string[];
  onLogout: () => void;
  onChangeSheet: () => void;
}

export interface loadAllRollsParams {
  selectedSubjectsCode: string[];
  setSelectedRolls: React.Dispatch<React.SetStateAction<string[]>>;
  setAllValidRolls: React.Dispatch<React.SetStateAction<string[]>>;
  sheetID: string;
}

export interface RollInputParams {
  e: React.KeyboardEvent<HTMLInputElement>;
  inputRoll: string;
  selectedSubjectsCode: string[];
  allValidRolls: string[];
  selectedRolls: string[];
  setSelectedRolls: React.Dispatch<React.SetStateAction<string[]>>;
  setInputRoll: React.Dispatch<React.SetStateAction<string>>;
}

export interface SubmitAttendanceParams {
  e: React.SubmitEvent<HTMLFormElement>;
  sheetID: string;
  selectedSubjects: string[];
  attendanceDate: string;
  selectedRolls: string[];
  setSubmitting: (loading: boolean) => void;
  setSelectedRolls: (rolls: string[]) => void;
  setInputRoll: (input: string) => void;
  setAttendanceDate: (date: string) => void;
  setSelectedSubjectCodes: (subjects: string[]) => void;
}
