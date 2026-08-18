import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id.");

export const submitQuizSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: objectId,
        selectedIndex: z.number().int().min(0).max(5).nullable(),
      }),
    )
    .max(100),
});

export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;

/* ========================================================================== */
/*                          Bilingual question text                           */
/* ========================================================================== */

/*
  The Quiz model stores one string per prompt and one per option — there is no
  second language column and no runtime translation layer. So a bilingual
  question is one string carrying both languages, joined here in exactly one
  place: the built-in question bank and the CSV importer must agree, or the
  importer's duplicate detection (which compares question text) would stop
  recognising questions the bank wrote.
*/

/** Collapse newlines and runs of spaces — the runner renders text on one line. */
export function normalizeCell(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Prompt: the Hindi follows as its own sentence. */
export function joinBilingualText(en: string, hi: string): string {
  const left = normalizeCell(en);
  const right = normalizeCell(hi);
  if (!right) return left;
  if (!left) return right;
  return `${left} ${right}`;
}

/** Option: short labels read better slashed than sentenced. */
export function joinBilingualOption(en: string, hi: string): string {
  const left = normalizeCell(en);
  const right = normalizeCell(hi);
  if (!right) return left;
  if (!left) return right;
  if (left === right) return left; // numerals and English-grammar drills
  return `${left} / ${right}`;
}

/** Comparison key for "is this the same question?". */
export function questionKey(text: string): string {
  return normalizeCell(text).normalize("NFC").toLowerCase();
}

/* ========================================================================== */
/*                           CSV question import                              */
/* ========================================================================== */

export const QUIZ_IMPORT = {
  /** A question sheet for one quiz is small; anything larger is a wrong file. */
  maxBytes: 512 * 1024,
  /**
   * Ceiling on the whole request body. The CSV travels as a JSON string, and
   * JSON escaping plus the envelope inflate it past the file's own size — so
   * this is deliberately looser than `maxBytes`, which still caps the file.
   */
  maxRequestBytes: 1024 * 1024,
  maxRows: 200,
  /**
   * Cap on the questions a single quiz may hold. The runner loads a quiz whole
   * and appending is unbounded otherwise: two 200-row imports would make a
   * 400-question paper no child will ever finish.
   */
  maxQuestionsPerQuiz: 200,
  /** Mirrors the Quiz model's own limits so a row can never fail late. */
  maxQuestionChars: 500,
  maxOptionChars: 200,
  maxPoints: 1000,
} as const;

export const QUIZ_IMPORT_MODES = ["replace", "append"] as const;
export type QuizImportMode = (typeof QUIZ_IMPORT_MODES)[number];

/** Canonical column names, in the order the sample file writes them. */
export const QUIZ_IMPORT_COLUMNS = [
  "question",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correct",
  "points",
  "questionHi",
  "optionAHi",
  "optionBHi",
  "optionCHi",
  "optionDHi",
] as const;

export type QuizImportColumn = (typeof QUIZ_IMPORT_COLUMNS)[number];

export const QUIZ_IMPORT_REQUIRED_COLUMNS: readonly QuizImportColumn[] = [
  "question",
  "optionA",
  "optionB",
  "correct",
];

/**
 * Header aliases, keyed by the normalised header (lowercased, non-alphanumerics
 * stripped). Spreadsheets arrive with "Option A", "option_a" and "OPTIONA" from
 * the same office, and rejecting a sheet over a space would be indefensible.
 */
const HEADER_ALIASES: Record<string, QuizImportColumn> = {
  question: "question",
  questiontext: "question",
  questionen: "question",
  prompt: "question",
  questionhi: "questionHi",
  questionhindi: "questionHi",
  optiona: "optionA",
  a: "optionA",
  optionb: "optionB",
  b: "optionB",
  optionc: "optionC",
  c: "optionC",
  optiond: "optionD",
  d: "optionD",
  optionahi: "optionAHi",
  optionahindi: "optionAHi",
  ahi: "optionAHi",
  optionbhi: "optionBHi",
  optionbhindi: "optionBHi",
  bhi: "optionBHi",
  optionchi: "optionCHi",
  optionchindi: "optionCHi",
  chi: "optionCHi",
  optiondhi: "optionDHi",
  optiondhindi: "optionDHi",
  dhi: "optionDHi",
  correct: "correct",
  correctoption: "correct",
  correctanswer: "correct",
  answer: "correct",
  ans: "correct",
  key: "correct",
  points: "points",
  point: "points",
  marks: "points",
  score: "points",
};

/** The file the admin downloads from the import dialog. */
export const QUIZ_IMPORT_SAMPLE_CSV = [
  "question,optionA,optionB,optionC,optionD,correct,points,questionHi,optionAHi,optionBHi,optionCHi,optionDHi",
  '"What is the capital of India?",Mumbai,Kolkata,New Delhi,Chennai,c,10,"भारत की राजधानी कौन-सी है?",मुंबई,कोलकाता,नई दिल्ली,चेन्नई',
  '"Which planet is known as the Red Planet?",Venus,Mars,Jupiter,Saturn,b,10,"किस ग्रह को लाल ग्रह कहा जाता है?",शुक्र,मंगल,बृहस्पति,शनि',
  '"Which gas do plants take in, during the day, to make food?",Oxygen,"Carbon dioxide",Nitrogen,Hydrogen,b,15,"पौधे दिन में भोजन बनाने के लिए कौन-सी गैस लेते हैं?",ऑक्सीजन,"कार्बन डाइऑक्साइड",नाइट्रोजन,हाइड्रोजन',
  '"What is 7 multiplied by 8?",54,56,58,64,b,,"7 को 8 से गुणा करने पर कितना होता है?",54,56,58,64',
  '"Who is known as the Father of the Nation?","Jawaharlal Nehru","Mahatma Gandhi","Sardar Patel","Bhagat Singh",b,10,"राष्ट्रपिता किसे कहा जाता है?","जवाहरलाल नेहरू","महात्मा गांधी","सरदार पटेल","भगत सिंह"',
  "",
].join("\r\n");

/**
 * The sample file as it should be written to disk. Excel decides a .csv is
 * UTF-8 only when it starts with a byte-order mark; without one the Devanagari
 * columns open as mojibake and the admin edits garbage.
 */
export function sampleCsvFileContent(): string {
  return String.fromCharCode(BOM) + QUIZ_IMPORT_SAMPLE_CSV;
}

/**
 * Fields every import shares, whatever the questions are drawn from.
 *
 * `mode` is the whole contract in one word and the admin must choose it:
 *  - replace — the quiz ends up holding exactly these questions, and anything
 *    already there is dropped.
 *  - append  — these questions are added after the existing ones, minus any
 *    whose text the quiz already has.
 *
 * `commit: false` is a dry run: same parsing, same validation, same duplicate
 * check, nothing written. The preview the admin sees is that dry run's answer,
 * which is why the preview and the write can never disagree about a row.
 */
const importEnvelope = {
  quizId: objectId,
  mode: z.enum(QUIZ_IMPORT_MODES),
  commit: z.boolean(),
};

export const quizCsvImportSchema = z.object({
  ...importEnvelope,
  source: z.literal("csv"),
  /*
    A cheap upper bound only — `.max()` counts UTF-16 code units and a
    Devanagari cell costs three bytes per unit, so the byte limit that actually
    holds is enforced on the raw request in the route handler.
  */
  csv: z.string().min(1, "The file is empty.").max(QUIZ_IMPORT.maxBytes),
});

export const quizBankFillSchema = z.object({
  ...importEnvelope,
  source: z.literal("bank"),
  /** How many questions to draw. Clamped to the bank's real size server-side. */
  count: z.number().int().min(1).max(QUIZ_IMPORT.maxQuestionsPerQuiz),
  points: z.number().int().min(0).max(QUIZ_IMPORT.maxPoints).default(10),
});

export const quizImportRequestSchema = z.discriminatedUnion("source", [
  quizCsvImportSchema,
  quizBankFillSchema,
]);

export type QuizImportRequest = z.infer<typeof quizImportRequestSchema>;
export type QuizImportSource = QuizImportRequest["source"];

/** One thing wrong with one line, phrased for a non-technical admin. */
export type QuizImportIssue = {
  /** 1-based line number in the uploaded file, so it maps onto the sheet. */
  line: number;
  column?: QuizImportColumn | "header";
  message: string;
};

export type QuizImportRow = {
  line: number;
  /** 1-based position among data rows (blank lines do not count). */
  index: number;
  text: string;
  options: string[];
  correctIndex: number;
  points: number;
};

export type QuizImportParse = {
  rows: QuizImportRow[];
  issues: QuizImportIssue[];
  /** Headers we did not recognise — silently ignoring a typo would be worse. */
  unknownColumns: string[];
  dataLineCount: number;
};

/** Enough rows for the admin to recognise their own sheet, not a second copy of it. */
export const QUIZ_IMPORT_PREVIEW_ROWS = 12;

export type QuizImportPreviewRow = {
  line: number;
  text: string;
  options: string[];
  correctIndex: number;
  points: number;
  /** The quiz already has this question: append skips it, replace keeps its id. */
  duplicate: boolean;
};

/**
 * What the import endpoint answers with, for a dry run and for a write alike.
 * Shared so the dialog reports the server's arithmetic rather than its own.
 */
export type QuizImportResult = {
  /** Every row passed. False means nothing was written and `issues` says why. */
  valid: boolean;
  committed: boolean;
  source: QuizImportSource;
  mode: QuizImportMode;
  existingCount: number;
  /** Rows that parsed and validated. */
  parsedCount: number;
  /** Of those, how many the quiz already holds. */
  duplicateCount: number;
  addCount: number;
  /** Existing questions that replace mode drops. */
  removedCount: number;
  totalAfter: number;
  issues: QuizImportIssue[];
  unknownColumns: string[];
  preview: QuizImportPreviewRow[];
  /** Rows beyond the preview window, so the count is never misread as the total. */
  previewTruncated: number;
  error?: string;
};

/* --------------------------------- parsing -------------------------------- */

type RawRecord = { line: number; cells: string[] };

/**
 * U+FEFF, the byte-order mark Excel writes at the head of "CSV UTF-8" exports.
 * Spelled as a code point rather than a literal so it stays visible in a diff.
 */
const BOM = 0xfeff;

function stripBom(value: string): string {
  return value.charCodeAt(0) === BOM ? value.slice(1) : value;
}

/** Excel writes ';' in several European locales; TSV comes from copy-paste. */
function detectDelimiter(headerLine: string): string {
  const counts = [",", ";", "\t"].map((d) => ({ d, n: headerLine.split(d).length - 1 }));
  const best = counts.reduce((a, b) => (b.n > a.n ? b : a));
  return best.n > 0 ? best.d : ",";
}

/**
 * RFC 4180-shaped CSV reader.
 *
 * Handles the things real spreadsheets actually emit: a UTF-8 BOM, CRLF (and
 * lone-CR) line endings, quoted fields containing the delimiter or a newline,
 * and doubled quotes as an escaped quote. Line numbers count physical lines —
 * including the ones inside a quoted field — because that is what the admin's
 * spreadsheet row numbers will agree with.
 */
export function parseCsv(input: string): RawRecord[] {
  const text = stripBom(input);
  if (!text) return [];

  const firstBreak = text.search(/[\r\n]/);
  const delimiter = detectDelimiter(firstBreak === -1 ? text : text.slice(0, firstBreak));

  const records: RawRecord[] = [];
  let cells: string[] = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let recordLine = 1;

  const endRecord = () => {
    cells.push(field);
    records.push({ line: recordLine, cells });
    cells = [];
    field = "";
    recordLine = line;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
        continue;
      }
      if (ch === "\r") {
        if (text[i + 1] === "\n") i++;
        field += "\n";
        line++;
        continue;
      }
      if (ch === "\n") line++;
      field += ch;
      continue;
    }

    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === delimiter) {
      cells.push(field);
      field = "";
      continue;
    }
    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      line++;
      endRecord();
      recordLine = line;
      continue;
    }
    field += ch;
  }

  // A file ending in a newline leaves nothing pending; anything else is a last row.
  if (field !== "" || cells.length > 0) endRecord();

  return records.filter((r) => r.cells.some((c) => c.trim() !== ""));
}

function normalizeHeader(header: string): string {
  return stripBom(header).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** "b", "B)", "2", "option b" all mean the second option. */
function parseCorrectToken(raw: string): number | null {
  const token = raw.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^option/, "");
  if (token.length !== 1) return null;
  if (token >= "a" && token <= "d") return token.charCodeAt(0) - 97;
  if (token >= "1" && token <= "4") return Number(token) - 1;
  return null;
}

const OPTION_COLUMNS: readonly QuizImportColumn[] = ["optionA", "optionB", "optionC", "optionD"];
const OPTION_HI_COLUMNS: readonly QuizImportColumn[] = [
  "optionAHi",
  "optionBHi",
  "optionCHi",
  "optionDHi",
];
const OPTION_LETTERS = ["a", "b", "c", "d"] as const;

/**
 * Parse and fully validate a CSV of questions.
 *
 * Every row is checked and every problem is collected — the admin gets the whole
 * list of what is wrong with their sheet in one pass rather than fixing one line,
 * re-uploading, and discovering the next. Rows that pass come back ready to store.
 */
export function parseQuizCsv(csv: string): QuizImportParse {
  const records = parseCsv(csv);
  const issues: QuizImportIssue[] = [];

  if (records.length === 0) {
    return {
      rows: [],
      issues: [{ line: 1, column: "header", message: "The file is empty." }],
      unknownColumns: [],
      dataLineCount: 0,
    };
  }

  // ---- header ----
  const headerRecord = records[0];
  const columnIndex = new Map<QuizImportColumn, number>();
  const unknownColumns: string[] = [];

  headerRecord.cells.forEach((raw, i) => {
    const label = raw.trim();
    if (!label) return;
    const canonical = HEADER_ALIASES[normalizeHeader(label)];
    if (!canonical) {
      unknownColumns.push(label);
      return;
    }
    if (!columnIndex.has(canonical)) columnIndex.set(canonical, i);
  });

  const missing = QUIZ_IMPORT_REQUIRED_COLUMNS.filter((c) => !columnIndex.has(c));
  if (missing.length > 0) {
    issues.push({
      line: headerRecord.line,
      column: "header",
      message:
        `The header row is missing: ${missing.join(", ")}. ` +
        `Expected columns: ${QUIZ_IMPORT_COLUMNS.join(", ")} (Hindi columns are optional).`,
    });
    return { rows: [], issues, unknownColumns, dataLineCount: 0 };
  }

  const dataRecords = records.slice(1);
  if (dataRecords.length === 0) {
    issues.push({
      line: headerRecord.line,
      column: "header",
      message: "The file has a header row but no questions under it.",
    });
    return { rows: [], issues, unknownColumns, dataLineCount: 0 };
  }
  if (dataRecords.length > QUIZ_IMPORT.maxRows) {
    issues.push({
      line: dataRecords[QUIZ_IMPORT.maxRows].line,
      message: `Too many rows — this file has ${dataRecords.length} questions and the limit is ${QUIZ_IMPORT.maxRows}. Split it into two files.`,
    });
    return { rows: [], issues, unknownColumns, dataLineCount: dataRecords.length };
  }

  // ---- rows ----
  const rows: QuizImportRow[] = [];
  const seen = new Map<string, number>(); // question key -> line it first appeared on

  dataRecords.forEach((record, i) => {
    const line = record.line;
    const before = issues.length;
    const cell = (column: QuizImportColumn): string => {
      const idx = columnIndex.get(column);
      if (idx === undefined) return "";
      return normalizeCell(record.cells[idx] ?? "");
    };

    // Question text.
    const questionEn = cell("question");
    const questionHi = cell("questionHi");
    if (!questionEn) {
      issues.push({
        line,
        column: "question",
        message: questionHi
          ? "The question column is empty. Put the question text there — the Hindi column only adds to it."
          : "The question column is empty.",
      });
    }
    const text = joinBilingualText(questionEn, questionHi);
    if (text.length > QUIZ_IMPORT.maxQuestionChars) {
      issues.push({
        line,
        column: "question",
        message: `The question is ${text.length} characters long once English and Hindi are joined; the limit is ${QUIZ_IMPORT.maxQuestionChars}.`,
      });
    }

    // Options: A and B are required, C and D optional, and no holes in between.
    const options: string[] = [];
    let holeSeen = false;
    OPTION_COLUMNS.forEach((column, oi) => {
      const en = cell(column);
      const hi = cell(OPTION_HI_COLUMNS[oi]);
      if (!en) {
        if (oi < 2) {
          issues.push({
            line,
            column,
            message: `${column} is empty. Every question needs at least two options.`,
          });
        } else {
          holeSeen = true;
          if (hi) {
            issues.push({
              line,
              column: OPTION_HI_COLUMNS[oi],
              message: `${OPTION_HI_COLUMNS[oi]} has Hindi text but ${column} is empty — add the English option or clear the Hindi one.`,
            });
          }
        }
        return;
      }
      if (holeSeen) {
        issues.push({
          line,
          column,
          message: `${column} is filled but an earlier option column is empty. Fill the options in order: A, B, C, D.`,
        });
        return;
      }
      const merged = joinBilingualOption(en, hi);
      if (merged.length > QUIZ_IMPORT.maxOptionChars) {
        issues.push({
          line,
          column,
          message: `${column} is ${merged.length} characters long once English and Hindi are joined; the limit is ${QUIZ_IMPORT.maxOptionChars}.`,
        });
        return;
      }
      options.push(merged);
    });

    // Correct answer.
    const correctRaw = cell("correct");
    let correctIndex = -1;
    if (!correctRaw) {
      issues.push({ line, column: "correct", message: "The correct column is empty — enter a, b, c or d." });
    } else {
      const parsed = parseCorrectToken(correctRaw);
      if (parsed === null) {
        issues.push({
          line,
          column: "correct",
          message: `"${correctRaw}" is not a valid answer key. Use a, b, c or d (1–4 also works).`,
        });
      } else if (parsed >= options.length) {
        issues.push({
          line,
          column: "correct",
          message: `The answer is "${OPTION_LETTERS[parsed]}" but option ${OPTION_LETTERS[parsed].toUpperCase()} is empty.`,
        });
      } else {
        correctIndex = parsed;
      }
    }

    // Points.
    const pointsRaw = cell("points");
    let points = 10;
    if (pointsRaw) {
      const n = Number(pointsRaw);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > QUIZ_IMPORT.maxPoints) {
        issues.push({
          line,
          column: "points",
          message: `"${pointsRaw}" is not a valid point value. Use a whole number between 0 and ${QUIZ_IMPORT.maxPoints}, or leave the cell blank for 10.`,
        });
      } else {
        points = n;
      }
    }

    // Duplicates inside the same file are an authoring mistake, not a merge
    // decision — the admin should see them rather than have one silently win.
    const key = questionKey(text);
    if (key) {
      const firstLine = seen.get(key);
      if (firstLine !== undefined) {
        issues.push({
          line,
          column: "question",
          message: `This question is already on line ${firstLine} of the same file. Remove one of the two.`,
        });
      } else {
        seen.set(key, line);
      }
    }

    if (issues.length === before) {
      rows.push({ line, index: i + 1, text, options, correctIndex, points });
    }
  });

  return { rows, issues, unknownColumns, dataLineCount: dataRecords.length };
}
