import { describe, it, expect, vi, beforeEach } from "vitest";
import { User, Token } from "@/server/models";
import { AccountStatus } from "@/lib/enums";
import { verifyPassword } from "@/server/auth/password";

// Email delivery is irrelevant to these assertions and must not hit the network.
vi.mock("@/server/services/email.service", () => ({
  sendVerificationEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
}));

const { registerUser, verifyEmail } = await import("@/server/services/auth.service");
const { verifyOtp, issueOtp } = await import("@/server/services/otp.service");

function registration(over: Record<string, unknown> = {}) {
  const n = Math.floor(Math.random() * 1_000_000);
  return {
    name: "Alice Kumar",
    email: `alice-${n}@test.dev`,
    password: "AlicePass123",
    confirmPassword: "AlicePass123",
    acceptTerms: true as const,
    ...over,
  };
}

/** Pulls the raw OTP out of the issuing path, since it is hashed at rest. */
async function issueCodeFor(userId: string) {
  return issueOtp(userId, "EMAIL_OTP");
}

describe("registration — unverified re-registration", () => {
  let input: ReturnType<typeof registration>;

  beforeEach(() => {
    input = registration();
  });

  it("creates a PENDING account with a wallet", async () => {
    const { userId } = await registerUser(input);
    const user = await User.findById(userId);
    expect(user?.status).toBe(AccountStatus.PENDING);
  });

  it("re-sends instead of dead-ending when the account is still PENDING", async () => {
    await registerUser(input);
    // The original 409 left the user with no way to ever verify.
    await expect(registerUser(input)).resolves.toMatchObject({ resent: true });
  });

  it("rejects a second registration once the account is ACTIVE", async () => {
    const { userId } = await registerUser(input);
    await User.updateOne(
      { _id: userId },
      { $set: { status: AccountStatus.ACTIVE, emailVerified: new Date() } },
    );
    await expect(registerUser(input)).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  /**
   * Regression guard for a one-request account takeover: the PENDING re-send
   * path once overwrote the stored credentials with whatever the second,
   * unauthenticated request supplied. Anyone who knew a pending address could
   * seize the account, and the victim verifying by email would activate it
   * under the attacker's password.
   */
  it("does not let a second registration overwrite the stored password", async () => {
    const { userId } = await registerUser(input);
    const before = await User.findById(userId).select("+passwordHash name");

    await registerUser({
      ...input,
      name: "Mallory",
      password: "MalloryPass123",
      confirmPassword: "MalloryPass123",
    });

    const after = await User.findById(userId).select("+passwordHash name");
    expect(after?.passwordHash).toBe(before?.passwordHash);
    expect(after?.name).toBe(before?.name);
    expect(await verifyPassword("MalloryPass123", after!.passwordHash)).toBe(false);
    expect(await verifyPassword(input.password, after!.passwordHash)).toBe(true);
  });

  it("does not let a second registration attach a referrer to someone's account", async () => {
    const { userId } = await registerUser(input);
    const attacker = await registerUser(registration());
    const attackerUser = await User.findById(attacker.userId);

    await registerUser({ ...input, referralCode: attackerUser!.referralCode });

    const victim = await User.findById(userId);
    expect(victim?.referrer).toBeNull();
  });
});

describe("OTP verification", () => {
  it("activates the account on a correct code", async () => {
    const input = registration();
    const { userId } = await registerUser(input);
    const code = await issueCodeFor(userId);

    await verifyOtp(input.email, code);

    const user = await User.findById(userId);
    expect(user?.status).toBe(AccountStatus.ACTIVE);
    expect(user?.emailVerified).toBeInstanceOf(Date);
  });

  it("consumes the code — the same one cannot be replayed", async () => {
    const input = registration();
    const { userId } = await registerUser(input);
    const code = await issueCodeFor(userId);

    await verifyOtp(input.email, code);
    await expect(verifyOtp(input.email, code)).rejects.toBeTruthy();
  });

  it("rejects a wrong code", async () => {
    const input = registration();
    const { userId } = await registerUser(input);
    const code = await issueCodeFor(userId);
    const wrong = code === "000000" ? "111111" : "000000";

    await expect(verifyOtp(input.email, wrong)).rejects.toMatchObject({ code: "BAD_OTP" });
  });

  it("locks out after repeated wrong codes, even if the right one follows", async () => {
    const input = registration();
    const { userId } = await registerUser(input);
    const code = await issueCodeFor(userId);
    const wrong = code === "000000" ? "111111" : "000000";

    for (let i = 0; i < 5; i += 1) {
      await expect(verifyOtp(input.email, wrong)).rejects.toBeTruthy();
    }
    // The correct code must not rescue a locked-out attempt.
    await expect(verifyOtp(input.email, code)).rejects.toMatchObject({
      code: "TOO_MANY_ATTEMPTS",
    });
  });

  it("rejects an expired code", async () => {
    const input = registration();
    const { userId } = await registerUser(input);
    const code = await issueCodeFor(userId);

    await Token.updateMany(
      { user: userId, purpose: "EMAIL_OTP" },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );

    await expect(verifyOtp(input.email, code)).rejects.toBeTruthy();
    const user = await User.findById(userId);
    expect(user?.status).toBe(AccountStatus.PENDING);
  });

  it("invalidates the previous code when a new one is issued", async () => {
    const input = registration();
    const { userId } = await registerUser(input);
    const first = await issueCodeFor(userId);
    const second = await issueCodeFor(userId);
    expect(second).not.toBe(first);

    await expect(verifyOtp(input.email, first)).rejects.toBeTruthy();
    await expect(verifyOtp(input.email, second)).resolves.toBeTruthy();
  });

  it("stores the code hashed, never in plaintext", async () => {
    const input = registration();
    const { userId } = await registerUser(input);
    const code = await issueCodeFor(userId);

    const tokens = await Token.find({ user: userId, purpose: "EMAIL_OTP" }).lean();
    expect(tokens.length).toBeGreaterThan(0);
    for (const t of tokens) {
      expect(JSON.stringify(t)).not.toContain(code);
    }
  });

  it("gives an unknown address the same failure as a wrong code", async () => {
    // Distinguishable errors would turn this endpoint into an email oracle.
    const unknown = verifyOtp("nobody-here@test.dev", "000000").catch((e) => e);
    const input = registration();
    await registerUser(input);
    await issueCodeFor((await User.findOne({ email: input.email }))!._id.toString());
    const wrong = verifyOtp(input.email, "999999").catch((e) => e);

    const [a, b] = await Promise.all([unknown, wrong]);
    expect(a.code).toBe(b.code);
    expect(a.message).toBe(b.message);
  });
});

describe("magic-link verification", () => {
  it("stays safe when the link is opened twice", async () => {
    const input = registration();
    const { userId } = await registerUser(input);
    const raw = await import("@/server/services/token.service").then((m) =>
      m.issueToken(userId, "EMAIL_VERIFY"),
    );

    await verifyEmail(raw);
    const user = await User.findById(userId);
    expect(user?.status).toBe(AccountStatus.ACTIVE);

    // A double-click, a prefetching mail client, or a browser back button must
    // not surface as a hard failure that scares an already-verified user: the
    // token is spent, but the account behind it is verified, so this resolves.
    await expect(verifyEmail(raw)).resolves.toBeUndefined();
    const after = await User.findById(userId);
    expect(after?.status).toBe(AccountStatus.ACTIVE);
  });

  it("still rejects a token that was never issued", async () => {
    // The idempotent path above must not soften into accepting any string.
    await expect(verifyEmail("f".repeat(64))).rejects.toMatchObject({ code: "BAD_TOKEN" });
  });
});
