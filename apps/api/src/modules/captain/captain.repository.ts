/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Repository isolates Mongoose documents. */
import mongoose from 'mongoose';
import type { UserRole } from '@auto-present/shared';
import { AuthSessionModel, GoogleCredentialModel, UserModel } from '../auth/auth.models.js';
import type { UserRecord } from '../auth/auth.models.js';
import { AuditEventModel } from '../auth/auth.models.js';
import { AttendanceWriteReceiptModel, ClassSheetRegistrationModel } from './captain.models.js';

export class CaptainRepository {
  findCaptainSession(userId: string, sessionId: string) {
    return AuthSessionModel.findOne({
      _id: sessionId,
      userId,
      requestedRole: 'CAPTAIN',
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).lean();
  }
  addUserRole(userId: string, role: UserRole) {
    return UserModel.findByIdAndUpdate(
      userId,
      { $addToSet: { roles: role } },
      { new: true },
    ).lean();
  }
  findUser(userId: string): Promise<UserRecord | null> {
    return UserModel.findById(userId).lean();
  }
  findCredential(userId: string) {
    return GoogleCredentialModel.findOne({ userId }).lean();
  }
  markCredentialReconnectRequired(userId: string) {
    return GoogleCredentialModel.updateOne(
      { userId },
      {
        $set: {
          status: 'RECONNECT_REQUIRED',
        },
      },
    );
  }

  findActive(userId: string) {
    return ClassSheetRegistrationModel.findOne({ captainUserId: userId, active: true }).lean();
  }
  findActiveRegistrationOptions() {
    return ClassSheetRegistrationModel.find(
      { active: true, health: 'READ_VERIFIED' },
      {
        department: 1,
        departmentKey: 1,
        semester: 1,
        semesterKey: 1,
        shift: 1,
        shiftKey: 1,
        _id: 0,
      },
    ).lean();
  }
  findStudentClassRegistration(departmentKey: string, semesterKey: string, shiftKey: string) {
    return ClassSheetRegistrationModel.findOne({
      departmentKey,
      semesterKey,
      shiftKey,
      active: true,
      health: 'READ_VERIFIED',
    })
      .sort({ updatedAt: -1, version: -1, _id: -1 })
      .lean();
  }
  markActiveHealth(userId: string, spreadsheetId: string, health: 'DEGRADED' | 'INVALID') {
    return ClassSheetRegistrationModel.updateOne(
      { captainUserId: userId, spreadsheetId, active: true },
      { $set: { health } },
    );
  }
  async registerVersion(userId: string, data: Record<string, unknown>) {
    const existing = await this.findActive(userId);
    if (
      existing &&
      existing.spreadsheetId === data.spreadsheetId &&
      existing.captainRoll === data.captainRoll &&
      existing.structureFingerprint === data.structureFingerprint
    )
      return existing;
    const latest = await ClassSheetRegistrationModel.findOne({ captainUserId: userId })
      .sort({ version: -1 })
      .lean();
    const filter = {
      active: true,
      $or: [
        { captainUserId: new mongoose.Types.ObjectId(userId) },
        {
          departmentKey: data.departmentKey,
          semesterKey: data.semesterKey,
          shiftKey: data.shiftKey,
        },
      ],
    };
    const createVersion = async (session?: mongoose.ClientSession) => {
      await ClassSheetRegistrationModel.updateMany(
        filter,
        { $set: { active: false, archivedAt: new Date() } },
        session ? { session } : undefined,
      );
      const [created] = await ClassSheetRegistrationModel.create(
        [
          {
            ...data,
            captainUserId: userId,
            version: Number(latest?.version ?? 0) + 1,
          },
        ],
        session ? { session } : undefined,
      );
      return created;
    };
    const session = await mongoose.startSession();
    try {
      let created;
      try {
        await session.withTransaction(async () => {
          created = await createVersion(session);
        });
      } catch (error) {
        const code =
          typeof error === 'object' && error !== null && 'code' in error
            ? (error as { code?: number }).code
            : undefined;
        if (code !== 20) throw error;
        created = await createVersion();
      }
      return created.toObject();
    } finally {
      await session.endSession();
    }
  }
  audit(data: Record<string, unknown>) {
    return AuditEventModel.create(data);
  }
  findAttendanceReceipt(registrationId: string, sheetId: number, date: string) {
    return AttendanceWriteReceiptModel.findOne({ registrationId, sheetId, date }).lean();
  }
  async createAttendanceReceipt(data: Record<string, unknown>) {
    try {
      return (await AttendanceWriteReceiptModel.create(data)).toObject();
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? (error as { code?: number }).code
          : undefined;
      if (code !== 11_000) throw error;
      return null;
    }
  }
  completeAttendanceReceipt(id: unknown, counts: Record<string, number>) {
    return AttendanceWriteReceiptModel.findByIdAndUpdate(
      id,
      { $set: { ...counts, status: 'SUCCESS' }, $unset: { failureCode: 1 } },
      { new: true },
    ).lean();
  }
  failAttendanceReceipt(id: unknown, failureCode: string) {
    return AttendanceWriteReceiptModel.updateOne(
      { _id: id, status: 'PENDING' },
      { $set: { status: 'FAILED', failureCode } },
    );
  }
  retryAttendanceReceipt(id: unknown, idempotencyKey: string) {
    return AttendanceWriteReceiptModel.findOneAndUpdate(
      { _id: id, status: 'FAILED', idempotencyKey },
      { $set: { status: 'PENDING' }, $unset: { failureCode: 1 } },
      { new: true },
    ).lean();
  }
}
