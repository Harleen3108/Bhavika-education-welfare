import { User, Wallet, Quiz } from "@/server/models";
import { AccountStatus, QuizType, QuizStatus } from "@/lib/enums";

let counter = 0;
function uniq() {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

export async function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  counter += 1;
  const n = counter;
  const rand = Math.floor(Math.random() * 1_000_000);
  const user = await User.create({
    name: `Test User ${n}`,
    email: `user-${n}-${rand}@test.dev`,
    passwordHash: "x",
    status: AccountStatus.ACTIVE,
    emailVerified: new Date(),
    // Counter-first so uniqueness is never truncated away.
    referralCode: `RC${n}X${rand}`.slice(0, 12).toUpperCase(),
    ...overrides,
  });
  await Wallet.create({ user: user._id });
  return user;
}

export async function makeQuiz(
  overrides: Partial<Record<string, unknown>> = {},
) {
  const u = uniq();
  return Quiz.create({
    title: `Quiz ${u}`,
    slug: `quiz-${u}`,
    type: QuizType.DAILY,
    status: QuizStatus.ACTIVE,
    startAt: new Date(Date.now() - 60_000),
    endAt: new Date(Date.now() + 3_600_000),
    timeLimitSeconds: 300,
    maxAttempts: 1,
    questions: [
      { text: "2 + 2 = ?", options: ["3", "4", "5"], correctIndex: 1, points: 10, order: 1 },
      { text: "Capital of India?", options: ["Mumbai", "New Delhi", "Chennai"], correctIndex: 1, points: 10, order: 2 },
    ],
    ...overrides,
  });
}
