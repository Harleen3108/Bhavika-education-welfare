import { describe, it, expect } from "vitest";
import { amountInWords } from "@/lib/amount-words";

describe("amountInWords (Indian numbering)", () => {
  it("formats amounts correctly", () => {
    expect(amountInWords(0)).toBe("Zero Rupees Only");
    expect(amountInWords(1)).toBe("One Rupees Only");
    expect(amountInWords(500)).toBe("Five Hundred Rupees Only");
    expect(amountInWords(1000)).toBe("One Thousand Rupees Only");
    expect(amountInWords(2500)).toBe("Two Thousand Five Hundred Rupees Only");
    expect(amountInWords(125000)).toBe("One Lakh Twenty Five Thousand Rupees Only");
    expect(amountInWords(10000000)).toBe("One Crore Rupees Only");
    expect(amountInWords(11111)).toBe("Eleven Thousand One Hundred Eleven Rupees Only");
  });
});
