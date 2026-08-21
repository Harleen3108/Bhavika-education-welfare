import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import type { IdCardPrint } from "./idcard.service";

/*
  A print-ready PDF member card.

  Layout is drawn directly with pdf-lib primitives and its built-in Helvetica —
  no SVG, so there is no dependency on system fonts being present on the server
  (Vercel's runtime is font-sparse). The only raster inputs are the member's
  photo (normalised to PNG via sharp) and the foundation logo.
*/

const NAVY = rgb(0x1d / 255, 0x4e / 255, 0x89 / 255);
const GREEN = rgb(0x63 / 255, 0xa5 / 255, 0x2f / 255);
const INK = rgb(0.1, 0.09, 0.08);
const MUTED = rgb(0.42, 0.39, 0.36);
const WHITE = rgb(1, 1, 1);
const FRAME = rgb(0.85, 0.87, 0.92);

// Landscape, roughly 2× a credit card so the photo and text are legible.
const W = 520;
const H = 328;

/**
 * Helvetica's WinAnsi encoding throws on characters it can't represent (e.g.
 * Devanagari). Names on Indian government IDs are romanised, so we sanitise to
 * printable ASCII rather than crash — a defensive fallback, not the happy path.
 */
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

/** Trim a single line to fit `maxWidth`, adding an ellipsis when cut. */
function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let s = safe(text);
  if (font.widthOfTextAtSize(s, size) <= maxWidth) return s;
  while (s.length > 1 && font.widthOfTextAtSize(`${s}…`, size) > maxWidth) s = s.slice(0, -1);
  return `${s}…`;
}

/** Wrap `text` into lines that each fit `maxWidth`. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number, maxLines: number): string[] {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  // Anything left over is squeezed into the last line with an ellipsis.
  return lines.map((l, i) => (i === maxLines - 1 ? fit(l, font, size, maxWidth) : l));
}

async function loadLogo(doc: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "logo-mark.png"));
    return await doc.embedPng(bytes);
  } catch {
    return null;
  }
}

async function loadPhoto(doc: PDFDocument, url: string): Promise<PDFImage | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const raw = Buffer.from(await res.arrayBuffer());
    // Normalise whatever Cloudinary served (webp/avif/jpeg) to a portrait PNG.
    const png = await sharp(raw).resize(240, 300, { fit: "cover", position: "attention" }).png().toBuffer();
    return await doc.embedPng(png);
  } catch {
    return null;
  }
}

export async function renderIdCardPdf(card: IdCardPrint): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Bhavika ID Card — ${safe(card.memberId)}`);
  const page = doc.addPage([W, H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Card body + outer frame.
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, borderColor: FRAME, borderWidth: 1 });

  // Header band.
  const headerH = 60;
  page.drawRectangle({ x: 0, y: H - headerH, width: W, height: headerH, color: NAVY });
  const logo = await loadLogo(doc);
  if (logo) page.drawImage(logo, { x: 16, y: H - headerH + 6, width: 48, height: 48 });
  page.drawText("Bhavika Education & Welfare Foundation", {
    x: 74,
    y: H - 28,
    size: 13,
    font: bold,
    color: WHITE,
  });
  page.drawText("Official Member Identity Card", {
    x: 74,
    y: H - 44,
    size: 9,
    font,
    color: rgb(0.86, 0.9, 0.98),
  });

  // Photo, framed.
  const px = 22;
  const pw = 120;
  const ph = 150;
  const pyTop = H - headerH - 12; // 12pt gap below the header
  const py = pyTop - ph;
  page.drawRectangle({ x: px - 2, y: py - 2, width: pw + 4, height: ph + 4, color: NAVY });
  const photo = await loadPhoto(doc, card.photoUrl);
  if (photo) {
    page.drawImage(photo, { x: px, y: py, width: pw, height: ph });
  } else {
    page.drawRectangle({ x: px, y: py, width: pw, height: ph, color: rgb(0.92, 0.92, 0.92) });
    page.drawText("No photo", { x: px + 32, y: py + ph / 2, size: 9, font, color: MUTED });
  }

  // Fields, to the right of the photo.
  const fx = px + pw + 26;
  const fieldW = W - fx - 20;
  let fy = pyTop - 8;
  const field = (label: string, value: string) => {
    page.drawText(label.toUpperCase(), { x: fx, y: fy, size: 7, font: bold, color: GREEN });
    page.drawText(fit(value || "-", bold, 11, fieldW), { x: fx, y: fy - 14, size: 11, font: bold, color: INK });
    fy -= 30;
  };
  field("Member ID", card.memberId);
  field("Name", card.fullName);
  field("Father's Name", card.fatherName);
  field("City", card.city || "-");

  // Address can wrap onto a second/third line.
  page.drawText("ADDRESS", { x: fx, y: fy, size: 7, font: bold, color: GREEN });
  const addrLines = wrap(card.address || "-", font, 10, fieldW, 3);
  addrLines.forEach((line, i) => {
    page.drawText(line, { x: fx, y: fy - 14 - i * 13, size: 10, font, color: INK });
  });

  // Footer strip.
  const footerH = 24;
  page.drawRectangle({ x: 0, y: 0, width: W, height: footerH, color: GREEN });
  page.drawText(`Issued ${safe(card.issuedOn)}   |   Valid until ${safe(card.validUntil)}`, {
    x: 16,
    y: 8,
    size: 8,
    font: bold,
    color: WHITE,
  });
  const site = "bhavikafoundation.org";
  page.drawText(site, {
    x: W - font.widthOfTextAtSize(site, 8) - 16,
    y: 8,
    size: 8,
    font,
    color: WHITE,
  });

  return doc.save();
}
