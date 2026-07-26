import type mongoose from 'mongoose';
import { AuthSessionModel } from '../auth/auth.models.js';
import { StudentRegistrationModel } from './student.models.js';

type StudentRegistrationCreateInput = {
  userId: string;
  department: string;
  departmentKey: string;
  semester: string;
  semesterKey: string;
  shift: string;
  shiftKey: string;
  roll: string;
  rollKey: string;
  captainRegistrationId: string;
  spreadsheetId: string;
  verifiedAt: Date;
  status: 'ACTIVE' | 'REVERIFICATION_REQUIRED';
};

type StudentRegistrationVerificationUpdateInput = {
  department: string;
  departmentKey: string;
  semester: string;
  semesterKey: string;
  shift: string;
  shiftKey: string;
  roll: string;
  rollKey: string;
  captainRegistrationId: string;
  spreadsheetId: string;
  verifiedAt: Date;
  status: 'ACTIVE' | 'REVERIFICATION_REQUIRED';
};

export class StudentRepository {
  findStudentSession(userId: string, sessionId: string) {
    const Session = AuthSessionModel as mongoose.Model<{
      _id: string;
      userId: string;
      requestedRole: string;
      revokedAt?: Date;
      expiresAt: Date;
    }>;
    return Session.findOne({
      _id: sessionId,
      userId,
      requestedRole: 'STUDENT',
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).lean();
  }

  findByUserId(userId: string) {
    return StudentRegistrationModel.findOne({ userId }).lean();
  }

  findActiveByUserId(userId: string) {
    return StudentRegistrationModel.findOne({
      userId,
      status: 'ACTIVE',
    }).lean();
  }

  create(input: StudentRegistrationCreateInput) {
    return StudentRegistrationModel.create(input);
  }

  updateAfterVerification(userId: string, input: StudentRegistrationVerificationUpdateInput) {
    return StudentRegistrationModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          department: input.department,
          departmentKey: input.departmentKey,
          semester: input.semester,
          semesterKey: input.semesterKey,
          shift: input.shift,
          shiftKey: input.shiftKey,
          roll: input.roll,
          rollKey: input.rollKey,
          captainRegistrationId: input.captainRegistrationId,
          spreadsheetId: input.spreadsheetId,
          verifiedAt: input.verifiedAt,
          status: input.status,
        },
      },
      { new: true },
    ).lean();
  }

  markReverificationRequired(userId: string) {
    return StudentRegistrationModel.findOneAndUpdate(
      { userId, status: 'ACTIVE' },
      { $set: { status: 'REVERIFICATION_REQUIRED' } },
      { new: true },
    ).lean();
  }
}
