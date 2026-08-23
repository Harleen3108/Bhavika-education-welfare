import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import { DonationKind } from "@/lib/enums";
import type { CertificateData } from "./donation.service";

/*
  A donation / volunteer certificate as a print-ready landscape PDF.

  Drawn with pdf-lib's built-in Times fonts (no system-font dependency). Only
  the logo is a raster input. Amounts print as "Rs." (the ₹ glyph isn't in
  Times' WinAnsi encoding), and non-Latin text is sanitised to ASCII so a
  Devanagari name never crashes rendering.
*/

const W = 842;
const H = 595;
const NAVY = rgb(0x1d / 255, 0x4e / 255, 0x89 / 255);
const GREEN = rgb(0x63 / 255, 0xa5 / 255, 0x2f / 255);
const INK = rgb(0.12, 0.1, 0.09);
const MUTED = rgb(0.42, 0.39, 0.36);
const GOLD = rgb(0.72, 0.55, 0.15);

function safe(text: string): string {
  return (text || "")
    .split("")
    .map((ch) => {
      const c = ch.charCodeAt(0);
      return c >= 32 && c <= 126 ? ch : "?";
    })
    .join("")
    .trim();
}

function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let s = safe(text);
  if (font.widthOfTextAtSize(s, size) <= maxWidth) return s;
  while (s.length > 1 && font.widthOfTextAtSize(`${s}…`, size) > maxWidth) s = s.slice(0, -1);
  return `${s}…`;
}

async function loadLogo(doc: PDFDocument): Promise<PDFImage | null> {
  try {
    return await doc.embedPng(await readFile(path.join(process.cwd(), "public", "logo-mark.png")));
  } catch {
    return null;
  }
}

export async function renderDonationCertificate(data: CertificateData): Promise<Uint8Array> {
  const isVolunteer = data.kind === DonationKind.VOLUNTEER;
  const doc = await PDFDocument.create();
  doc.setTitle(`Bhavika ${isVolunteer ? "Volunteer" : "Donation"} Certificate — ${safe(data.receiptNo)}`);
  const page = doc.addPage([W, H]);
  const roman = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const cx = W / 2;

  const center = (text: string, y: number, size: number, font: PDFFont, color = INK, maxWidth = W - 120) => {
    const t = fit(text, font, size, maxWidth);
    page.drawText(t, { x: cx - font.widthOfTextAtSize(t, size) / 2, y, size, font, color });
  };

  // Backdrop + double gold/navy border.
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: NAVY, borderWidth: 3 });
  page.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: GOLD, borderWidth: 1 });

  // Logo + foundation name.
  const logo = await loadLogo(doc);
  if (logo) page.drawImage(logo, { x: cx - 32, y: H - 118, width: 64, height: 64 });
  center("Bhavika Education & Welfare Foundation", H - 140, 18, bold, NAVY);

  // Title.
  center(isVolunteer ? "Certificate of Appreciation" : "Certificate of Donation", H - 190, 30, bold, GREEN);
  page.drawRectangle({ x: cx - 90, y: H - 200, width: 180, height: 2, color: GOLD });

  // Body.
  center("This is to gratefully acknowledge that", H - 240, 13, italic, MUTED);
  center(data.donorName, H - 278, 26, bold, NAVY);

  if (isVolunteer) {
    center("has generously volunteered their time and effort towards", H - 312, 14, roman);
    center(data.categoryName, H - 338, 16, bold, INK);
  } else {
    center("has kindly donated", H - 312, 14, roman);
    center(`Rs. ${data.amount.toLocaleString("en-IN")}`, H - 342, 20, bold, INK);
    center(`(${data.amountWords})`, H - 366, 12, italic, MUTED, W - 160);
    center(`towards ${data.categoryName}`, H - 392, 14, roman);
  }

  if (data.message) {
    center(`“${data.message}”`, H - (isVolunteer ? 368 : 416), 11, italic, MUTED, W - 200);
  }

  // Footer row: receipt / date on the left, signatory on the right.
  page.drawText(`Receipt No: ${safe(data.receiptNo)}`, { x: 70, y: 96, size: 11, font: bold, color: INK });
  page.drawText(`Date: ${safe(data.date)}`, { x: 70, y: 80, size: 11, font: roman, color: MUTED });
  if (data.pan) {
    page.drawText(`PAN: ${safe(data.pan)}`, { x: 70, y: 64, size: 11, font: roman, color: MUTED });
  }

  page.drawRectangle({ x: W - 250, y: 92, width: 180, height: 1, color: INK });
  page.drawText("Authorised Signatory", { x: W - 250, y: 76, size: 11, font: roman, color: MUTED });

  center("Thank you for standing with us — bhavikafoundation.org", 44, 10, italic, MUTED);

  return doc.save();
}
