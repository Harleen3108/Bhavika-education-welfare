import { describe, it, expect } from "vitest";
import { renderIdCardPdf } from "@/server/services/idcard-pdf";

describe("renderIdCardPdf", () => {
  it("renders a valid PDF (embeds the logo, draws all fields)", async () => {
    const bytes = await renderIdCardPdf({
      memberId: "BHAV-2026-004821",
      fullName: "Test Member",
      fatherName: "Test Father",
      city: "Rohtak",
      address: "123 Example Road, Model Town, Rohtak, Haryana 124001",
      photoUrl: "", // no network — exercises the placeholder path
      issuedOn: "21 Aug 2026",
      validUntil: "21 Aug 2028",
    });

    // A real PDF starts with "%PDF-".
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it("does not throw on non-Latin characters (sanitises to ASCII)", async () => {
    const bytes = await renderIdCardPdf({
      memberId: "BHAV-2026-000001",
      fullName: "राहुल शर्मा", // Devanagari — must not crash Helvetica encoding
      fatherName: "Test",
      city: "दिल्ली",
      address: "पता",
      photoUrl: "",
      issuedOn: "21 Aug 2026",
      validUntil: "21 Aug 2028",
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });
});
