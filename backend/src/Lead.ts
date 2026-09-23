import { Schema, model } from 'mongoose';

export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Won',
  'Lost',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

const leadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    status: { type: String, enum: LEAD_STATUSES, default: 'New' },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

// Prevent duplicate leads on email — enforced at the DB level.
leadSchema.index({ email: 1 }, { unique: true });

export const Lead = model('Lead', leadSchema);
