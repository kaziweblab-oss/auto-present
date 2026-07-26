/* eslint-disable @typescript-eslint/no-explicit-any -- Mongoose's runtime model registry erases schema generics during hot reload. */
import mongoose, { type InferSchemaType } from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    googleSubject: { type: String, required: true, unique: true, immutable: true },
    email: { type: String, required: true, index: true },
    displayName: { type: String, required: true },
    avatarUrl: String,
    emailVerified: { type: Boolean, required: true },
    roles: [{ type: String, enum: ['ADMIN', 'CAPTAIN', 'STUDENT'] }],
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  },
  { timestamps: true },
);

const adminMembershipSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, required: true },
    superAdmin: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
adminMembershipSchema.index(
  { email: 1, active: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);

const authSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestedRole: {
      type: String,
      enum: ['ADMIN', 'CAPTAIN', 'STUDENT'],
      required: true,
    },
    loginRole: {
      type: String,
      enum: ['ADMIN', 'CAPTAIN', 'STUDENT'],
      required: true,
    },
    familyId: { type: String, required: true, unique: true },
    tokenHash: { type: String, required: true, unique: true },
    previousTokenHashes: [{ type: String }],
    userAgent: { type: String, default: 'Unknown device' },
    ipHash: String,
    lastActivityAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    revocationReason: String,
  },
  { timestamps: true },
);
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const oauthTransactionSchema = new mongoose.Schema(
  {
    stateHash: { type: String, required: true, unique: true },
    pkceVerifier: { type: String, required: true },
    requestedRole: { type: String, enum: ['ADMIN', 'CAPTAIN', 'STUDENT'], required: true },
    flow: { type: String, enum: ['IDENTITY', 'WORKSPACE'], required: true },
    returnPath: { type: String, required: true },
    browserHash: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date, required: true },
    consumedAt: Date,
  },
  { timestamps: true },
);
oauthTransactionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const googleCredentialSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    ciphertext: String,
    iv: String,
    authTag: String,
    keyVersion: String,
    scopes: [{ type: String }],
    status: { type: String, enum: ['CONNECTED', 'RECONNECT_REQUIRED'], default: 'CONNECTED' },
    accessExpiresAt: Date,
  },
  { timestamps: true },
);

const auditEventSchema = new mongoose.Schema({
  actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: String,
  event: { type: String, required: true },
  outcome: { type: String, enum: ['SUCCESS', 'FAILURE'], required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  requestId: String,
  occurredAt: { type: Date, default: Date.now, index: true },
});

export type UserRecord = InferSchemaType<typeof userSchema>;
export const UserModel: any = mongoose.models.User ?? mongoose.model('User', userSchema);
export const AdminMembershipModel: any =
  mongoose.models.AdminMembership ?? mongoose.model('AdminMembership', adminMembershipSchema);
export const AuthSessionModel: any =
  mongoose.models.AuthSession ?? mongoose.model('AuthSession', authSessionSchema);
export const OAuthTransactionModel: any =
  mongoose.models.OAuthTransaction ?? mongoose.model('OAuthTransaction', oauthTransactionSchema);
export const GoogleCredentialModel: any =
  mongoose.models.GoogleCredential ?? mongoose.model('GoogleCredential', googleCredentialSchema);
export const AuditEventModel: any =
  mongoose.models.AuditEvent ?? mongoose.model('AuditEvent', auditEventSchema);
