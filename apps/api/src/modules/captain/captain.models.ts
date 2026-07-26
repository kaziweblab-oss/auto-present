/* eslint-disable @typescript-eslint/no-explicit-any -- Mongoose's runtime registry erases schema generics during hot reload. */
import mongoose, { type InferSchemaType } from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
    subjectCode: { type: String, required: true },
    subjectName: { type: String, required: true },
    sheetId: { type: Number, required: true },
    tabTitle: { type: String, required: true },
    headerRow: { type: Number, required: true },
    rollColumn: { type: Number, required: true },
    presentMarker: { type: String, required: true },
    absentMarker: { type: String, required: true },
    dateFormat: { type: String, required: true },
  },
  { _id: false },
);

const classSheetRegistrationSchema = new mongoose.Schema(
  {
    captainUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    spreadsheetId: { type: String, required: true },
    spreadsheetUrl: { type: String, required: true },
    spreadsheetTitle: { type: String, required: true },
    department: { type: String, required: true },
    departmentKey: { type: String, required: true },
    semester: { type: String, required: true },
    semesterKey: { type: String, required: true },
    shift: { type: String, required: true },
    shiftKey: { type: String, required: true },
    captainRoll: { type: String, required: true },
    subjects: { type: [subjectSchema], required: true },
    parserVersion: { type: String, required: true },
    structureFingerprint: { type: String, required: true },
    health: {
      type: String,
      enum: ['READ_VERIFIED', 'DEGRADED', 'INVALID'],
      required: true,
    },
    writeScopeGranted: { type: Boolean, required: true },
    warnings: [{ type: String }],
    version: { type: Number, required: true, min: 1 },
    active: { type: Boolean, required: true, default: true },
    archivedAt: Date,
    verifiedAt: { type: Date, required: true },
    lastSuccessfulSyncAt: Date,
  },
  { timestamps: true },
);

classSheetRegistrationSchema.index(
  { departmentKey: 1, semesterKey: 1, shiftKey: 1, active: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
classSheetRegistrationSchema.index(
  { captainUserId: 1, active: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
classSheetRegistrationSchema.index({ captainUserId: 1, version: 1 }, { unique: true });

export type ClassSheetRegistrationRecord = InferSchemaType<typeof classSheetRegistrationSchema>;
export const ClassSheetRegistrationModel: any =
  mongoose.models.ClassSheetRegistration ??
  mongoose.model('ClassSheetRegistration', classSheetRegistrationSchema);

const attendanceWriteReceiptSchema = new mongoose.Schema(
  {
    captainUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSheetRegistration',
      required: true,
    },
    sheetId: { type: Number, required: true },
    subjectCode: { type: String, required: true },
    date: { type: String, required: true },
    idempotencyKey: { type: String, required: true },
    total: Number,
    present: Number,
    absent: Number,
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], required: true },
    failureCode: String,
  },
  { timestamps: true },
);
attendanceWriteReceiptSchema.index({ registrationId: 1, sheetId: 1, date: 1 }, { unique: true });
attendanceWriteReceiptSchema.index({ captainUserId: 1, idempotencyKey: 1 }, { unique: true });

export const AttendanceWriteReceiptModel: any =
  mongoose.models.AttendanceWriteReceipt ??
  mongoose.model('AttendanceWriteReceipt', attendanceWriteReceiptSchema);
