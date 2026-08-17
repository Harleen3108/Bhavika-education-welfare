import "server-only";
import type { Types } from "mongoose";
import { dbConnect } from "@/server/db/connect";
import {
  Quiz,
  QuizAttempt,
  User,
  type IQuiz,
  type IQuizQuestion,
} from "@/server/models";
import {
  QuizStatus,
  AttemptStatus,
  AccountStatus,
  PointSource,
} from "@/lib/enums";
import { periodKeyForQuiz } from "@/lib/periods";
import { DomainError } from "@/server/errors";
import { creditPoints } from "./wallet.service";

const SUBMIT_GRACE_MS = 2000; // small clock-skew grace for on-time classification

// ---------- DTOs ----------
export type PlayQuestion = {
  id: string;
  text: string;
  imageUrl?: string;
  options: string[];
  points: number;
};

export type StartResult = {
  attemptId: string;
  quizTitle: string;
  timeLimitSeconds: number;
  expiresAt: string;
  serverNow: string;
  questions: PlayQuestion[];
};

export type ResultQuestion = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
  isCorrect: boolean;
  points: number;
  pointsEarned: number;
};

export type ResultDTO = {
  attemptId: string;
  quizTitle: string;
  status: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string | null;
  questions: ResultQuestion[];
};

export type QuizListItem = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  type: string;
  questionCount: number;
  timeLimitSeconds: number;
  maxAttempts: number;
  attemptsUsed: number;
  attemptedThisPeriod: boolean;
  resultAttemptId: string | null;
  inProgressAttemptId: string | null;
};

// ---------- Helpers ----------
function sortedQuestions(quiz: IQuiz): IQuizQuestion[] {
  return [...quiz.questions].sort((a, b) => a.order - b.order);
}

function sanitize(quiz: IQuiz): PlayQuestion[] {
  return sortedQuestions(quiz).map((q) => ({
    id: (q._id as Types.ObjectId).toString(),
    text: q.text,
    imageUrl: q.imageUrl,
    options: q.options,
    points: q.points,
  }));
}

function isWindowOpen(quiz: IQuiz, now: Date): boolean {
  return quiz.status === QuizStatus.ACTIVE && quiz.startAt <= now && quiz.endAt >= now;
}

// ---------- Availability ----------
export async function getAvailableQuizzes(userId: string): Promise<QuizListItem[]> {
  await dbConnect();
  const now = new Date();
  const quizzes = await Quiz.find({
    status: QuizStatus.ACTIVE,
    startAt: { $lte: now },
    endAt: { $gte: now },
  })
    .sort({ type: 1, startAt: -1 })
    .lean();

  const items = await Promise.all(
    quizzes.map(async (quiz) => {
      const periodKey = periodKeyForQuiz(quiz.type, now);
      const attempts = await QuizAttempt.find({ user: userId, quiz: quiz._id, periodKey })
        .sort({ createdAt: -1 })
        .lean();
      const finalized = attempts.find(
        (a) => a.status === AttemptStatus.SUBMITTED || a.status === AttemptStatus.EXPIRED,
      );
      const inProgress = attempts.find(
        (a) => a.status === AttemptStatus.IN_PROGRESS && a.expiresAt > now,
      );
      return {
        id: quiz._id.toString(),
        slug: quiz.slug,
        title: quiz.title,
        description: quiz.description,
        type: quiz.type,
        questionCount: quiz.questions.length,
        timeLimitSeconds: quiz.timeLimitSeconds,
        maxAttempts: quiz.maxAttempts,
        attemptsUsed: attempts.filter((a) => a.status !== AttemptStatus.IN_PROGRESS).length,
        attemptedThisPeriod: Boolean(finalized),
        resultAttemptId: finalized?._id.toString() ?? null,
        inProgressAttemptId: inProgress?._id.toString() ?? null,
      };
    }),
  );
  return items;
}

export type QuizPageData = {
  slug: string;
  title: string;
  description?: string;
  type: string;
  questionCount: number;
  timeLimitSeconds: number;
  maxAttempts: number;
  windowOpen: boolean;
  eligibility:
    | "CAN_START"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "MAX_ATTEMPTS"
    | "NOT_ACTIVE"
    | "NOT_VERIFIED";
  inProgressAttemptId: string | null;
  resultAttemptId: string | null;
};

export async function getQuizPageData(
  slug: string,
  userId: string,
): Promise<QuizPageData | null> {
  await dbConnect();
  const now = new Date();
  const quiz = await Quiz.findOne({ slug }).lean();
  if (!quiz) return null;

  const user = await User.findById(userId).select("status").lean();
  const verified = user?.status === AccountStatus.ACTIVE;
  const windowOpen = isWindowOpen(quiz as IQuiz, now);

  const periodKey = periodKeyForQuiz(quiz.type, now);
  const attempts = await QuizAttempt.find({ user: userId, quiz: quiz._id, periodKey })
    .sort({ createdAt: -1 })
    .lean();
  const finalized = attempts.find(
    (a) => a.status === AttemptStatus.SUBMITTED || a.status === AttemptStatus.EXPIRED,
  );
  const inProgress = attempts.find(
    (a) => a.status === AttemptStatus.IN_PROGRESS && a.expiresAt > now,
  );
  const usedCount = attempts.filter((a) => a.status !== AttemptStatus.IN_PROGRESS).length;

  let eligibility: QuizPageData["eligibility"];
  if (!windowOpen) eligibility = "NOT_ACTIVE";
  else if (!verified) eligibility = "NOT_VERIFIED";
  else if (inProgress) eligibility = "IN_PROGRESS";
  else if (usedCount >= quiz.maxAttempts) eligibility = finalized ? "COMPLETED" : "MAX_ATTEMPTS";
  else eligibility = "CAN_START";

  return {
    slug: quiz.slug,
    title: quiz.title,
    description: quiz.description,
    type: quiz.type,
    questionCount: quiz.questions.length,
    timeLimitSeconds: quiz.timeLimitSeconds,
    maxAttempts: quiz.maxAttempts,
    windowOpen,
    eligibility,
    inProgressAttemptId: inProgress?._id.toString() ?? null,
    resultAttemptId: finalized?._id.toString() ?? null,
  };
}

// ---------- Start ----------
export async function startAttempt(userId: string, slug: string): Promise<StartResult> {
  await dbConnect();
  const now = new Date();

  const user = await User.findById(userId).select("status").lean();
  if (!user) throw new DomainError("User not found.", 404, "NOT_FOUND");
  if (user.status !== AccountStatus.ACTIVE) {
    throw new DomainError(
      "Please verify your email to take quizzes and earn points.",
      403,
      "NOT_VERIFIED",
    );
  }

  const quiz = await Quiz.findOne({ slug });
  if (!quiz) throw new DomainError("Quiz not found.", 404, "NOT_FOUND");
  if (!isWindowOpen(quiz, now)) {
    throw new DomainError("This quiz is not currently available.", 409, "NOT_ACTIVE");
  }

  const periodKey = periodKeyForQuiz(quiz.type, now);

  // Expire any stale in-progress attempts from this period.
  await QuizAttempt.updateMany(
    { user: userId, quiz: quiz._id, periodKey, status: AttemptStatus.IN_PROGRESS, expiresAt: { $lte: now } },
    { $set: { status: AttemptStatus.EXPIRED, submittedAt: now } },
  );

  // Resume a live in-progress attempt if present.
  const live = await QuizAttempt.findOne({
    user: userId,
    quiz: quiz._id,
    periodKey,
    status: AttemptStatus.IN_PROGRESS,
    expiresAt: { $gt: now },
  });
  if (live) {
    return {
      attemptId: live._id.toString(),
      quizTitle: quiz.title,
      timeLimitSeconds: quiz.timeLimitSeconds,
      expiresAt: live.expiresAt.toISOString(),
      serverNow: now.toISOString(),
      questions: sanitize(quiz),
    };
  }

  // Enforce max attempts for this period.
  const usedCount = await QuizAttempt.countDocuments({
    user: userId,
    quiz: quiz._id,
    periodKey,
    status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED] },
  });
  if (usedCount >= quiz.maxAttempts) {
    throw new DomainError("You've reached the maximum attempts for this quiz.", 409, "MAX_ATTEMPTS");
  }

  const expiresAt = new Date(
    Math.min(now.getTime() + quiz.timeLimitSeconds * 1000, quiz.endAt.getTime()),
  );

  try {
    const attempt = await QuizAttempt.create({
      user: userId,
      quiz: quiz._id,
      attemptNumber: usedCount + 1,
      periodKey,
      status: AttemptStatus.IN_PROGRESS,
      startedAt: now,
      expiresAt,
      totalQuestions: quiz.questions.length,
      answers: [],
    });
    return {
      attemptId: attempt._id.toString(),
      quizTitle: quiz.title,
      timeLimitSeconds: quiz.timeLimitSeconds,
      expiresAt: expiresAt.toISOString(),
      serverNow: now.toISOString(),
      questions: sanitize(quiz),
    };
  } catch (err) {
    // Race on the unique (user,quiz,periodKey,attemptNumber) index → resume.
    if ((err as { code?: number })?.code === 11000) {
      const existing = await QuizAttempt.findOne({
        user: userId,
        quiz: quiz._id,
        periodKey,
        status: AttemptStatus.IN_PROGRESS,
      });
      if (existing) {
        return {
          attemptId: existing._id.toString(),
          quizTitle: quiz.title,
          timeLimitSeconds: quiz.timeLimitSeconds,
          expiresAt: existing.expiresAt.toISOString(),
          serverNow: now.toISOString(),
          questions: sanitize(quiz),
        };
      }
    }
    throw err;
  }
}

// ---------- Submit ----------
export async function submitAttempt(
  userId: string,
  attemptId: string,
  submitted: { questionId: string; selectedIndex: number | null }[],
): Promise<ResultDTO> {
  await dbConnect();
  const now = new Date();

  const attempt = await QuizAttempt.findById(attemptId);
  if (!attempt) throw new DomainError("Attempt not found.", 404, "NOT_FOUND");
  // IDOR protection: the attempt must belong to the caller.
  if (attempt.user.toString() !== userId) {
    throw new DomainError("You do not have access to this attempt.", 403, "FORBIDDEN");
  }

  const quiz = await Quiz.findById(attempt.quiz).lean();
  if (!quiz) throw new DomainError("Quiz not found.", 404, "NOT_FOUND");

  // Already finalized → return the existing result (idempotent, no re-reward).
  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    return buildResult(attempt, quiz as IQuiz);
  }

  // Grade on the server using the authoritative correct answers.
  const submittedMap = new Map(submitted.map((s) => [s.questionId, s.selectedIndex]));
  let score = 0;
  let correctCount = 0;
  const answers = sortedQuestions(quiz as IQuiz).map((q) => {
    const qid = (q._id as Types.ObjectId).toString();
    const selectedIndex = submittedMap.has(qid) ? submittedMap.get(qid)! : null;
    const isCorrect =
      selectedIndex !== null && selectedIndex >= 0 && selectedIndex === q.correctIndex;
    const pointsEarned = isCorrect ? q.points : 0;
    if (isCorrect) {
      correctCount += 1;
      score += pointsEarned;
    }
    return { questionId: q._id as Types.ObjectId, selectedIndex, isCorrect, pointsEarned };
  });

  const onTime = now.getTime() <= attempt.expiresAt.getTime() + SUBMIT_GRACE_MS;
  const status = onTime ? AttemptStatus.SUBMITTED : AttemptStatus.EXPIRED;

  // Atomic single-finalization guard: only the first submit transitions the
  // attempt out of IN_PROGRESS and sets rewarded=true.
  const finalized = await QuizAttempt.findOneAndUpdate(
    { _id: attempt._id, user: userId, status: AttemptStatus.IN_PROGRESS },
    {
      $set: {
        status,
        submittedAt: now,
        answers,
        score,
        correctCount,
        totalQuestions: quiz.questions.length,
        rewarded: true,
      },
    },
    { new: true },
  );

  if (!finalized) {
    // Lost the race — another request already finalized. Return that result.
    const fresh = await QuizAttempt.findById(attemptId);
    return buildResult(fresh!, quiz as IQuiz);
  }

  // Award points exactly once (idempotency key derived from the attempt id).
  if (score > 0) {
    await creditPoints({
      userId,
      source: PointSource.QUIZ,
      points: score,
      referenceType: "QuizAttempt",
      referenceId: attempt._id,
      description: `Quiz reward: ${quiz.title}`,
      idempotencyKey: `quiz:${attempt._id.toString()}`,
    });
  }

  // Completing a first eligible quiz can qualify the referral that invited this
  // user. Never let a referral hiccup break quiz submission.
  try {
    const { processReferralReward } = await import("./referral.service");
    await processReferralReward(userId);
  } catch (e) {
    console.error("[quiz] referral qualification hook failed:", e);
  }

  return buildResult(finalized, quiz as IQuiz);
}

// ---------- Result ----------
export async function getResult(userId: string, attemptId: string): Promise<ResultDTO> {
  await dbConnect();
  const attempt = await QuizAttempt.findById(attemptId);
  if (!attempt) throw new DomainError("Result not found.", 404, "NOT_FOUND");
  if (attempt.user.toString() !== userId) {
    throw new DomainError("You do not have access to this result.", 403, "FORBIDDEN");
  }
  const quiz = await Quiz.findById(attempt.quiz).lean();
  if (!quiz) throw new DomainError("Quiz not found.", 404, "NOT_FOUND");
  return buildResult(attempt, quiz as IQuiz);
}

function buildResult(
  attempt: {
    _id: Types.ObjectId;
    status: string;
    score: number;
    correctCount: number;
    totalQuestions: number;
    submittedAt: Date | null;
    answers: { questionId: Types.ObjectId; selectedIndex: number | null; isCorrect: boolean; pointsEarned: number }[];
  },
  quiz: IQuiz,
): ResultDTO {
  const answerById = new Map(attempt.answers.map((a) => [a.questionId.toString(), a]));

  const questions: ResultQuestion[] = sortedQuestions(quiz).map((q) => {
    const qid = (q._id as Types.ObjectId).toString();
    const a = answerById.get(qid);
    return {
      id: qid,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      selectedIndex: a?.selectedIndex ?? null,
      isCorrect: a?.isCorrect ?? false,
      points: q.points,
      pointsEarned: a?.pointsEarned ?? 0,
    };
  });

  return {
    attemptId: attempt._id.toString(),
    quizTitle: quiz.title,
    status: attempt.status,
    score: attempt.score,
    correctCount: attempt.correctCount,
    totalQuestions: attempt.totalQuestions,
    submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
    questions,
  };
}
