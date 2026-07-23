/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await -- Repository is the isolated Mongoose document boundary. */
import type { UserRole } from '@auto-present/shared';
import {
  AdminMembershipModel,
  AuditEventModel,
  AuthSessionModel,
  GoogleCredentialModel,
  OAuthTransactionModel,
  UserModel,
} from './auth.models.js';

export class AuthRepository {
  async ensureInitialAdmin(email: string) {
    return AdminMembershipModel.findOneAndUpdate(
      { email, active: true },
      { $set: { superAdmin: true }, $setOnInsert: { email, active: true } },
      { upsert: true, new: true },
    ).lean();
  }
  async upsertGoogleUser(identity: { sub: string; email: string; name: string; picture?: string }) {
    return UserModel.findOneAndUpdate(
      { googleSubject: identity.sub },
      {
        $set: {
          email: identity.email,
          displayName: identity.name,
          avatarUrl: identity.picture,
          emailVerified: true,
          status: 'ACTIVE',
        },
        $setOnInsert: { roles: [] },
      },
      { upsert: true, new: true },
    ).lean();
  }
  async authorizeRequestedRole(
    userId: unknown,
    email: string,
    role: UserRole,
  ): Promise<UserRole[]> {
    if (role !== 'ADMIN') return [];
    const membership = await AdminMembershipModel.findOne({ email, active: true }).lean();
    if (!membership) return [];
    await AdminMembershipModel.updateOne({ _id: membership._id }, { $set: { userId } });
    await UserModel.updateOne({ _id: userId }, { $addToSet: { roles: 'ADMIN' } });
    return ['ADMIN'];
  }
  createTransaction(data: Record<string, unknown>) {
    return OAuthTransactionModel.create(data);
  }
  consumeTransaction(stateHash: string) {
    return OAuthTransactionModel.findOneAndUpdate(
      { stateHash, consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
      { $set: { consumedAt: new Date() } },
      { new: false },
    ).lean();
  }
  findActiveTransaction(stateHash: string) {
    return OAuthTransactionModel.findOne({
      stateHash,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).lean();
  }
  createSession(data: Record<string, unknown>) {
    return AuthSessionModel.create(data);
  }
  findSessionByToken(tokenHash: string) {
    return AuthSessionModel.findOne({ $or: [{ tokenHash }, { previousTokenHashes: tokenHash }] });
  }
  rotateSession(id: unknown, oldHash: string, newHash: string) {
    return AuthSessionModel.findOneAndUpdate(
      {
        _id: id,
        tokenHash: oldHash,
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { tokenHash: newHash, lastActivityAt: new Date() },
        $push: { previousTokenHashes: oldHash },
      },
      { new: true },
    ).lean();
  }
  revokeFamily(familyId: string, reason: string) {
    return AuthSessionModel.updateMany(
      { familyId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date(), revocationReason: reason } },
    );
  }
  revokeSession(userId: string, sessionId: string, reason: string) {
    return AuthSessionModel.updateOne(
      { _id: sessionId, userId },
      { $set: { revokedAt: new Date(), revocationReason: reason } },
    );
  }
  revokeAll(userId: string, reason: string) {
    return AuthSessionModel.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date(), revocationReason: reason } },
    );
  }
  listSessions(userId: string) {
    return AuthSessionModel.find({
      userId,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastActivityAt: -1 })
      .lean();
  }
  findUser(id: string) {
    return UserModel.findById(id).lean();
  }
  findCredential(userId: string) {
    return GoogleCredentialModel.findOne({ userId }).lean();
  }
  upsertCredential(userId: string, update: Record<string, unknown>) {
    return GoogleCredentialModel.findOneAndUpdate(
      { userId },
      { $set: update, $setOnInsert: { userId } },
      { upsert: true, new: true },
    ).lean();
  }
  deleteCredential(userId: string) {
    return GoogleCredentialModel.deleteOne({ userId });
  }
  audit(data: Record<string, unknown>) {
    return AuditEventModel.create(data);
  }
}
