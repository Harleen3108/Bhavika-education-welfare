import { describe, it, expect } from "vitest";
import { getLeaderboard } from "@/server/services/leaderboard.service";
import { startAttempt, submitAttempt } from "@/server/services/quiz.service";
import { QuizAttempt } from "@/server/models";
import { LeaderboardPeriod, QuizType, AttemptStatus } from "@/lib/enums";
import { dailyKey, weeklyKey } from "@/lib/periods";
import { makeUser, makeQuiz } from "./helpers";

type QuizDoc = Awaited<ReturnType<typeof makeQuiz>>;

/** Play a quiz end-to-end and answer every question correctly. */
async function playPerfect(userId: string, quiz: QuizDoc) {
  const started = await startAttempt(userId, quiz.slug);
  const byId = new Map(
    quiz.questions.map((q) => [(q._id as { toString(): string }).toString(), q.correctIndex]),
  );
  const answers = started.questions.map((q) => ({
    questionId: q.id,
    selectedIndex: byId.get(q.id) ?? null,
  }));
  return submitAttempt(userId, started.attemptId, answers);
}

describe("leaderboard.getLeaderboard", () => {
  /*
    The reported bug: a member finishes the "Welcome Daily Quiz", the wallet
    ledger shows "Quiz reward: ... +30", but the leaderboard reads "Unranked".
    Both leaderboard pages default to the WEEKLY tab, and a DAILY attempt is
    stamped with a *daily* periodKey ("2026-08-17"), so a board keyed on
    "2026-W34" matched nothing.
  */
  it("ranks a member on the WEEKLY board after they finish a DAILY quiz", async () => {
    const user = await makeUser();
    const userId = user._id.toString();
    const quiz = await makeQuiz({ type: QuizType.DAILY });

    const result = await playPerfect(userId, quiz);
    expect(result.score).toBe(20);

    const board = await getLeaderboard(LeaderboardPeriod.WEEKLY, userId);

    expect(board.me?.points).toBe(20);
    expect(board.me?.rank).toBe(1);
    expect(board.rows).toHaveLength(1);
    expect(board.rows[0]?.isMe).toBe(true);
  });

  it("ranks a member on the MONTHLY board after they finish a DAILY quiz", async () => {
    const user = await makeUser();
    const userId = user._id.toString();
    const quiz = await makeQuiz({ type: QuizType.DAILY });

    await playPerfect(userId, quiz);
    const board = await getLeaderboard(LeaderboardPeriod.MONTHLY, userId);

    expect(board.me?.points).toBe(20);
    expect(board.me?.rank).toBe(1);
    expect(board.rows).toHaveLength(1);
  });

  it("ranks a member on the DAILY board after they finish a WEEKLY quiz", async () => {
    const user = await makeUser();
    const userId = user._id.toString();
    const quiz = await makeQuiz({ type: QuizType.WEEKLY });

    await playPerfect(userId, quiz);
    const board = await getLeaderboard(LeaderboardPeriod.DAILY, userId);

    expect(board.me?.points).toBe(20);
    expect(board.me?.rank).toBe(1);
  });

  it("ranks a member on the ALL_TIME board", async () => {
    const user = await makeUser();
    const userId = user._id.toString();
    const quiz = await makeQuiz({ type: QuizType.DAILY });

    await playPerfect(userId, quiz);
    const board = await getLeaderboard(LeaderboardPeriod.ALL_TIME, userId);

    expect(board.me?.points).toBe(20);
    expect(board.me?.rank).toBe(1);
    expect(board.rows[0]?.points).toBe(20);
  });

  it("agrees between the row list and the me-lookup on every period", async () => {
    const user = await makeUser();
    const userId = user._id.toString();
    const quiz = await makeQuiz({ type: QuizType.DAILY });
    await playPerfect(userId, quiz);

    for (const period of Object.values(LeaderboardPeriod)) {
      const board = await getLeaderboard(period, userId);
      const myRow = board.rows.find((r) => r.isMe);
      expect(myRow, `no row for me on ${period}`).toBeDefined();
      expect(board.me?.points, `me.points mismatch on ${period}`).toBe(myRow?.points);
      expect(board.me?.rank, `me.rank mismatch on ${period}`).toBe(myRow?.rank);
    }
  });

  it("ranks ties by competition ranking and orders by points", async () => {
    const [a, b, c] = await Promise.all([makeUser(), makeUser(), makeUser()]);
    const quiz = await makeQuiz({ type: QuizType.DAILY, maxAttempts: 1 });

    // Same quiz, different scores: a=20, b=20, c=10.
    await playPerfect(a._id.toString(), quiz);
    await playPerfect(b._id.toString(), quiz);

    const startedC = await startAttempt(c._id.toString(), quiz.slug);
    await submitAttempt(c._id.toString(), startedC.attemptId, [
      { questionId: startedC.questions[0].id, selectedIndex: quiz.questions[0].correctIndex },
      { questionId: startedC.questions[1].id, selectedIndex: null },
    ]);

    const board = await getLeaderboard(LeaderboardPeriod.WEEKLY, c._id.toString());
    expect(board.rows.map((r) => r.points)).toEqual([20, 20, 10]);
    expect(board.rows.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(board.me?.rank).toBe(3);
  });

  it("excludes attempts from an earlier period", async () => {
    const user = await makeUser();
    const userId = user._id.toString();
    const quiz = await makeQuiz({ type: QuizType.DAILY });
    await playPerfect(userId, quiz);

    // Backdate the finished attempt by ~40 days: still ALL_TIME, but outside
    // today's daily / this week's / this month's window.
    const longAgo = new Date(Date.now() - 40 * 24 * 3600 * 1000);
    await QuizAttempt.updateMany(
      { user: user._id },
      { $set: { submittedAt: longAgo, createdAt: longAgo, periodKey: dailyKey(longAgo) } },
      { timestamps: false },
    );

    for (const period of [
      LeaderboardPeriod.DAILY,
      LeaderboardPeriod.WEEKLY,
      LeaderboardPeriod.MONTHLY,
    ]) {
      const board = await getLeaderboard(period, userId);
      expect(board.rows, `${period} should be empty`).toHaveLength(0);
      expect(board.me?.points, `${period} points`).toBe(0);
      expect(board.me?.rank, `${period} rank`).toBeNull();
    }
  });

  it("ignores in-progress attempts", async () => {
    const user = await makeUser();
    const userId = user._id.toString();
    const quiz = await makeQuiz({ type: QuizType.DAILY });

    const started = await startAttempt(userId, quiz.slug);
    // Force a score onto the unfinished attempt — it must not count.
    await QuizAttempt.updateOne(
      { _id: started.attemptId },
      { $set: { score: 999, status: AttemptStatus.IN_PROGRESS } },
    );

    const board = await getLeaderboard(LeaderboardPeriod.WEEKLY, userId);
    expect(board.rows).toHaveLength(0);
    expect(board.me).toEqual({ rank: null, points: 0 });
  });

  it("reports zero points and a null rank for a member who has not played", async () => {
    const user = await makeUser();
    const board = await getLeaderboard(LeaderboardPeriod.WEEKLY, user._id.toString());
    expect(board.me).toEqual({ rank: null, points: 0 });
    expect(board.rows).toHaveLength(0);
  });

  it("still counts a daily attempt whose periodKey was never a weekly key", async () => {
    // Guards the regression directly: the stored key is a daily string, and the
    // weekly board must not depend on it matching weeklyKey().
    const user = await makeUser();
    const userId = user._id.toString();
    const quiz = await makeQuiz({ type: QuizType.DAILY });
    await playPerfect(userId, quiz);

    const attempt = await QuizAttempt.findOne({ user: user._id }).lean();
    expect(attempt?.periodKey).toBe(dailyKey());
    expect(attempt?.periodKey).not.toBe(weeklyKey());

    const board = await getLeaderboard(LeaderboardPeriod.WEEKLY, userId);
    expect(board.me?.rank).toBe(1);
  });
});
