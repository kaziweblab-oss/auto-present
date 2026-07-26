import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const studentRegistrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    department: { type: String, required: true },
    departmentKey: { type: String, required: true },
    semester: { type: String, required: true },
    semesterKey: { type: String, required: true },
    shift: { type: String, required: true },
    shiftKey: { type: String, required: true },
    roll: { type: String, required: true },
    rollKey: { type: String, required: true },
    captainRegistrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSheetRegistration',
      required: true,
    },
    spreadsheetId: { type: String, required: true },
    verifiedAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVERIFICATION_REQUIRED'],
      required: true,
    },
  },
  { timestamps: true },
);

studentRegistrationSchema.index({ userId: 1 }, { unique: true });
studentRegistrationSchema.index({ captainRegistrationId: 1, rollKey: 1 }, { unique: true });
studentRegistrationSchema.index({ status: 1 });

export type StudentRegistrationRecord = InferSchemaType<typeof studentRegistrationSchema>;
export const StudentRegistrationModel: Model<StudentRegistrationRecord> = (mongoose.models
  .StudentRegistration ??
  mongoose.model(
    'StudentRegistration',
    studentRegistrationSchema,
  )) as Model<StudentRegistrationRecord>;
