import mongoose, { Schema, type Model, type Types } from "mongoose";
import { QuizType, QuizStatus } from "@/lib/enums";

/**
 * Questions are embedded subdocuments of a Quiz. This keeps a quiz atomic to
 * fetch and edit. `correctIndex` is NEVER sent to the client before submission
 * — the service layer strips it when serving a quiz to a participant.
 */
export interface IQuizQuestion {
  _id: Types.ObjectId;
  text: string;
  imageUrl?: string;
  options: string[]; // 2..6 options
  correctIndex: number; // index into options
  points: number; // points if answered correctly
  order: number;
}

export interface IQuiz {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  type: QuizType;
  status: QuizStatus;

  startAt: Date;
  endAt: Date;
  timeLimitSeconds: number;
  maxAttempts: number;

  questions: IQuizQuestion[];

  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>(
  {
    text: { type: String, required: true, trim: true, maxlength: 500 },
    imageUrl: { type: String, trim: true },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length >= 2 && v.length <= 6,
        message: "A question must have between 2 and 6 options.",
      },
    },
    correctIndex: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (this: unknown, v: number) {
          const opts = (this as { options?: string[] }).options;
          return Array.isArray(opts) && v < opts.length;
        },
        message: "correctIndex is out of range for the given options.",
      },
    },
    points: { type: Number, default: 10, min: 0 },
    order: { type: Number, default: 0 },
  },
  { _id: true },
);

const QuizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, trim: true, maxlength: 1000 },
    type: { type: String, enum: Object.values(QuizType), required: true, index: true },
    status: {
      type: String,
      enum: Object.values(QuizStatus),
      default: QuizStatus.DRAFT,
      index: true,
    },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    timeLimitSeconds: { type: Number, required: true, min: 30 },
    maxAttempts: { type: Number, default: 1, min: 1 },
    questions: { type: [QuizQuestionSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// Availability query: active quizzes within their window, by type.
QuizSchema.index({ status: 1, type: 1, startAt: 1, endAt: 1 });

export const Quiz: Model<IQuiz> =
  (mongoose.models.Quiz as Model<IQuiz>) || mongoose.model<IQuiz>("Quiz", QuizSchema);
