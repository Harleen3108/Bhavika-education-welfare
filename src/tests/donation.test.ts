import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "crypto";
import {
  createCategory,
  listActiveCategories,
  updateCategory,
  deleteCategory,
  adminListCategories,
  adminRecordDonation,
  getMyDonations,
  getCertificateData,
  createDonation,
  verifyAndComplete,
  markPaidByOrder,
  adminRevealPan,
} from "@/server/services/donation.service";
import { renderDonationCertificate } from "@/server/services/donation-certificate";
import { Donation, DonationCategory } from "@/server/models";
import { decryptPII } from "@/server/crypto/pii";
import { DonationStatus, DonationKind, UserRole } from "@/lib/enums";
import { DomainError } from "@/server/errors";
import { makeUser } from "./helpers";

const ADMIN = "000000000000000000000009";

async function codeOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    return err instanceof DomainError ? err.code : `UNEXPECTED:${String(err)}`;
  }
}

async function makeCause(name = "Food donation") {
  return createCategory({ name, nameHi: "", description: "", active: true, order: 0 });
}

beforeAll(async () => {
  await Promise.all([Donation.syncIndexes(), DonationCategory.syncIndexes()]);
});

describe("causes", () => {
  it("creates, lists active only, updates and deletes", async () => {
    const a = await makeCause("Food donation");
    await createCategory({ name: "Hidden cause", active: false, order: 1, nameHi: "", description: "" });
    const active = await listActiveCategories();
    expect(active.map((c) => c.name)).toContain("Food donation");
    expect(active.map((c) => c.name)).not.toContain("Hidden cause");

    await updateCategory(a.id, { name: "Food & nutrition", active: true, order: 0, nameHi: "", description: "" });
    expect((await adminListCategories()).find((c) => c.id === a.id)?.name).toBe("Food & nutrition");

    await deleteCategory(a.id);
    expect((await adminListCategories()).find((c) => c.id === a.id)).toBeUndefined();
  });
});

describe("admin manual donation + volunteer", () => {
  it("records a paid donation, encrypts PAN, and issues a receipt number", async () => {
    const cause = await makeCause();
    const dto = await adminRecordDonation(
      { kind: DonationKind.DONATION, name: "Asha Devi", email: "asha@example.com", phone: "", amount: 2500, categoryId: cause.id, pan: "ABCDE1234F", anonymous: false, message: "" },
      ADMIN,
    );
    expect(dto.status).toBe(DonationStatus.PAID);
    expect(dto.amount).toBe(2500);
    expect(dto.receiptNo).toMatch(/^BF\/\d{4}\/\d{6}$/);
    expect(dto.panLast4).toBe("234F");

    const raw = await Donation.findById(dto.id).lean();
    expect(raw?.panEnc).not.toContain("ABCDE1234F");
    expect(decryptPII(raw!.panEnc!)).toBe("ABCDE1234F");
    expect(await adminRevealPan(dto.id)).toBe("ABCDE1234F");
  });

  it("issues a volunteer certificate with no amount", async () => {
    const cause = await makeCause("Women empowerment");
    const dto = await adminRecordDonation(
      { kind: DonationKind.VOLUNTEER, name: "Ravi", email: "ravi@example.com", phone: "", amount: 0, categoryId: cause.id, pan: "", anonymous: false, message: "Ran a workshop" },
      ADMIN,
    );
    expect(dto.kind).toBe(DonationKind.VOLUNTEER);
    expect(dto.amount).toBe(0);
    expect(dto.receiptNo).toBeTruthy();
  });
});

describe("guest → account email mapping", () => {
  it("shows a guest donation in the account later created with that email", async () => {
    const cause = await makeCause();
    // Guest donates (no account yet).
    await adminRecordDonation(
      { kind: DonationKind.DONATION, name: "Guest Donor", email: "later@example.com", phone: "", amount: 1000, categoryId: cause.id, pan: "", anonymous: false, message: "" },
      ADMIN,
    );
    // They sign up afterwards with the same email.
    const user = await makeUser({ email: "later@example.com" });
    const mine = await getMyDonations(user._id.toString(), "later@example.com");
    expect(mine).toHaveLength(1);
    expect(mine[0].amount).toBe(1000);
  });
});

describe("certificate download + authorization", () => {
  it("authorises admin, owner, email, and token; refuses others; renders a PDF", async () => {
    const cause = await makeCause();
    const owner = await makeUser({ email: "owner@example.com" });
    const dto = await adminRecordDonation(
      { kind: DonationKind.DONATION, name: "Owner", email: "owner@example.com", phone: "", amount: 500, categoryId: cause.id, pan: "ABCDE1234F", anonymous: false, message: "For the children" },
      ADMIN,
    );
    const raw = await Donation.findById(dto.id).lean();
    const token = raw!.receiptToken;

    // Admin, owner (by id), email owner, and token holder all allowed.
    const asAdmin = await getCertificateData(dto.id, { role: UserRole.ADMIN });
    expect(asAdmin.receiptNo).toBe(dto.receiptNo);
    expect(asAdmin.pan).toBe("ABCDE1234F"); // full PAN on the receipt
    expect(asAdmin.amountWords).toBe("Five Hundred Rupees Only");
    await getCertificateData(dto.id, { id: owner._id.toString() });
    await getCertificateData(dto.id, { email: "owner@example.com" });
    await getCertificateData(dto.id, { token });

    // A stranger with no claim is refused.
    expect(await codeOf(() => getCertificateData(dto.id, { id: "000000000000000000000001", email: "x@x.com" }))).toBe("FORBIDDEN");

    // Renders a valid PDF.
    const pdf = await renderDonationCertificate(asAdmin);
    expect(Buffer.from(pdf.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });
});

describe("online payment flow", () => {
  it("refuses to create an order when Razorpay isn't configured, leaving no orphan", async () => {
    const cause = await makeCause();
    expect(
      await codeOf(() =>
        createDonation(
          { name: "Test", email: "t@example.com", phone: "", amount: 1000, categoryId: cause.id, pan: "", anonymous: false, message: "" },
          null,
        ),
      ),
    ).toBe("NOT_CONFIGURED");
    // The CREATED row was rolled back.
    expect(await Donation.countDocuments({})).toBe(0);
  });

  it("verifies a valid signature, marks paid exactly once, and rejects a bad one", async () => {
    const cause = await makeCause();
    const orderId = "order_TESTORDER1";
    const paymentId = "pay_TESTPAYMENT1";
    // Seed a CREATED online donation as createDonation would (minus the real order).
    const [donation] = await Donation.create([
      {
        kind: DonationKind.DONATION,
        source: "ONLINE",
        status: DonationStatus.CREATED,
        donorName: "Net Donor",
        donorEmail: "net@example.com",
        amount: 750,
        category: cause.id,
        categoryName: cause.name,
        razorpayOrderId: orderId,
        receiptToken: "tok_test_123",
      },
    ]);

    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const goodSig = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

    const res = await verifyAndComplete({ donationId: donation._id.toString(), orderId, paymentId, signature: goodSig });
    expect(res.receiptNo).toMatch(/^BF\/\d{4}\/\d{6}$/);
    const paid = await Donation.findById(donation._id).lean();
    expect(paid?.status).toBe(DonationStatus.PAID);
    expect(paid?.razorpayPaymentId).toBe(paymentId);

    // Idempotent — a replay returns the same receipt, no second number.
    const again = await verifyAndComplete({ donationId: donation._id.toString(), orderId, paymentId, signature: goodSig });
    expect(again.receiptNo).toBe(res.receiptNo);

    // A tampered signature on a fresh order is rejected and marked FAILED.
    const [d2] = await Donation.create([
      {
        kind: DonationKind.DONATION,
        source: "ONLINE",
        status: DonationStatus.CREATED,
        donorName: "Bad Sig",
        donorEmail: "bad@example.com",
        amount: 100,
        category: cause.id,
        categoryName: cause.name,
        razorpayOrderId: "order_BAD",
        receiptToken: "tok_bad",
      },
    ]);
    expect(
      await codeOf(() => verifyAndComplete({ donationId: d2._id.toString(), orderId: "order_BAD", paymentId: "pay_x", signature: "deadbeef" })),
    ).toBe("BAD_SIGNATURE");
    expect((await Donation.findById(d2._id).lean())?.status).toBe(DonationStatus.FAILED);
  });

  it("settles via the webhook path (markPaidByOrder)", async () => {
    const cause = await makeCause();
    const [donation] = await Donation.create([
      {
        kind: DonationKind.DONATION,
        source: "ONLINE",
        status: DonationStatus.CREATED,
        donorName: "Hook Donor",
        donorEmail: "hook@example.com",
        amount: 300,
        category: cause.id,
        categoryName: cause.name,
        razorpayOrderId: "order_HOOK",
        receiptToken: "tok_hook",
      },
    ]);
    await markPaidByOrder("order_HOOK", "pay_HOOK");
    const paid = await Donation.findById(donation._id).lean();
    expect(paid?.status).toBe(DonationStatus.PAID);
    expect(paid?.receiptNo).toMatch(/^BF\/\d{4}\/\d{6}$/);
  });
});
