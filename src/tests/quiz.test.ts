import { describe, it, expect } from "vitest";
import { startAttempt, submitAttempt } from "@/server/services/quiz.service";
import { getWallet } from "@/server/services/wallet.service";
import { QuizAttempt } from "@/server/models";
import { AccountStatus } from "@/lib/enums";
import { makeUser, makeQuiz } from "./helpers";

/** The subset of a Quiz document this helper reads, rather than `any`. */
type QuizWithAnswers = {
  questions: { _id: { toString(): string }; correctIndex: number }[];
};

function correctAnswers(quizDoc: QuizWithAnswers, questions: { id: string }[]) {
  const byId = new Map(
    quizDoc.questions.map((q) => [q._id.toString(), q.correctIndex] as const),
  );
  return questions.map((q) => ({ questionId: q.id, selectedIndex: byId.get(q.id) as number }));
}

describe("quiz.service (anti-cheat + scoring)", () => {
  it("never exposes correct answers when serving a quiz", async () => {
    const user = await makeUser();
    const quiz = await makeQuiz();
    const started = await startAttempt(user._id.toString(), quiz.slug);
    for (const q of started.questions) {
      expect(q).not.toHaveProperty("correctIndex");
    }
  });

  it("scores on the server and credits the wallet once", async () => {
    const user = await makeUser();
    const quiz = await makeQuiz();
    const userId = user._id.toString();

    const started = await startAttempt(userId, quiz.slug);
    const answers = correctAnswers(quiz, started.questions);
    const result = await submitAttempt(userId, started.attemptId, answers);

    expect(result.score).toBe(20);
    expect(result.correctCount).toBe(2);
    expect(result.status).toBe("SUBMITTED");

    const wallet = await getWallet(userId);
    expect(wallet.quiz).toBe(20);
  });

  it("is idempotent on double submission (no double reward)", async () => {
    const user = await makeUser();
    const quiz = await makeQuiz();
    const userId = user._id.toString();

    const started = await startAttempt(userId, quiz.slug);
    const answers = correctAnswers(quiz, started.questions);

    const r1 = await submitAttempt(userId, started.attemptId, answers);
    const r2 = await submitAttempt(userId, started.attemptId, answers);

    expect(r1.score).toBe(20);
    expect(r2.score).toBe(20);
    const wallet = await getWallet(userId);
    expect(wallet.quiz).toBe(20); // credited once only
  });

  it("resumes the same attempt instead of creating a new one", async () => {
    const user = await makeUser();
    const quiz = await makeQuiz();
    const userId = user._id.toString();

    const a = await startAttempt(userId, quiz.slug);
    const b = await startAttempt(userId, quiz.slug);
    expect(a.attemptId).toBe(b.attemptId);
    expect(await QuizAttempt.countDocuments({ user: userId, quiz: quiz._id })).toBe(1);
  });

  it("ignores wrong answers (server truth) and awards zero", async () => {
    const user = await makeUser();
    const quiz = await makeQuiz();
    const userId = user._id.toString();
    const started = await startAttempt(userId, quiz.slug);
    // Deliberately choose index 0 for every question (both correct are index 1).
    const wrong = started.questions.map((q) => ({ questionId: q.id, selectedIndex: 0 }));
    const result = await submitAttempt(userId, started.attemptId, wrong);
    expect(result.score).toBe(0);
    const wallet = await getWallet(userId);
    expect(wallet.quiz).toBe(0);
  });

  it("blocks unverified (PENDING) users from starting", async () => {
    const user = await makeUser({ status: AccountStatus.PENDING, emailVerified: null });
    const quiz = await makeQuiz();
    await expect(startAttempt(user._id.toString(), quiz.slug)).rejects.toThrow();
  });
});
