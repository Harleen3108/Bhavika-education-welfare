import mongoose, { Schema, type Model, type Types } from "mongoose";
import { AttemptStatus } from "@/lib/enums";

/**
 * A single quiz attempt AND its result (merged — the result is just the
 * terminal state of an attempt). The server owns the clock:
 * `startedAt` / `expiresAt` are set on the server at start time and are the
 * only trusted timing source.
 *
 * `periodKey` scopes one attempt per user per day/week (e.g. "2026-08-11" or
 * "2026-W32"), enabling a unique index that enforces attempt limits and blocks
 * duplicate submissions atomically.
 */
export interface IAnswer {
  questionId: Types.ObjectId;
  selectedIndex: number | null;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface IQuizAttempt {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  quiz: Types.ObjectId;
  attemptNumber: number;
  periodKey: string;

  status: AttemptStatus;
  startedAt: Date;
  expiresAt: Date;
  submittedAt: Date | null;

  answers: IAnswer[];
  score: number; // total points earned
  correctCount: number;
  totalQuestions: number;

  /** True once a wallet credit has been created for this attempt. */
  rewarded: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    selectedIndex: { type: Number, default: null },
    isCorrect: { type: Boolean, default: false },
    pointsEarned: { type: Number, default: 0 },
  },
  { _id: false },
);

const QuizAttemptSchema = new Schema<IQuizAttempt>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    quiz: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    attemptNumber: { type: Number, default: 1 },
    periodKey: { type: String, required: true },

    status: {
      type: String,
      enum: Object.values(AttemptStatus),
      default: AttemptStatus.IN_PROGRESS,
      index: true,
    },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },

    answers: { type: [AnswerSchema], default: [] },
    score: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },

    rewarded: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One attempt per user, per quiz, per period, per attempt number.
QuizAttemptSchema.index(
  { user: 1, quiz: 1, periodKey: 1, attemptNumber: 1 },
  { unique: true },
);
// Leaderboard: submitted attempts by score within a period.
QuizAttemptSchema.index({ status: 1, periodKey: 1, score: -1 });
QuizAttemptSchema.index({ quiz: 1, score: -1 });

export const QuizAttempt: Model<IQuizAttempt> =
  (mongoose.models.QuizAttempt as Model<IQuizAttempt>) ||
  mongoose.model<IQuizAttempt>("QuizAttempt", QuizAttemptSchema);
