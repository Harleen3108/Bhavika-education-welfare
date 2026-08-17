import { describe, it, expect } from "vitest";
import { createSignedToken, verifySignedToken, verifyWebhookSignature } from "@/server/integrations/signing";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { toDisplayName } from "@/lib/utils";

describe("integration signing", () => {
  it("round-trips a valid signed token", () => {
    const token = createSignedToken({ ref: "abc", sub: "u1" }, 300);
    const payload = verifySignedToken(token);
    expect(payload?.ref).toBe("abc");
    expect(payload?.sub).toBe("u1");
  });

  it("rejects a tampered token", () => {
    const token = createSignedToken({ ref: "abc" }, 300);
    const tampered = token.slice(0, -2) + "xy";
    expect(verifySignedToken(tampered)).toBeNull();
  });

  it("rejects an expired token", () => {
    const now = Date.now();
    const token = createSignedToken({ ref: "abc" }, 10, now);
    expect(verifySignedToken(token, now + 11_000)).toBeNull();
  });

  it("verifies webhook signatures and rejects wrong ones", () => {
    const body = JSON.stringify({ referenceId: "r1" });
    const good = createSignedToken({}, 1).split(".")[1]; // not a valid sig for body
    expect(verifyWebhookSignature(body, good)).toBe(false);
  });
});

describe("password hashing", () => {
  it("hashes and verifies correctly, rejects wrong password", async () => {
    const hash = await hashPassword("Secret123");
    expect(hash).not.toBe("Secret123");
    expect(await verifyPassword("Secret123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("safe display name", () => {
  it("never leaks a full name", () => {
    expect(toDisplayName("Ramesh Kumar Sharma")).toBe("Ramesh K.");
    expect(toDisplayName("Anita")).toBe("Anita");
    expect(toDisplayName("")).toBe("Member");
  });
});
