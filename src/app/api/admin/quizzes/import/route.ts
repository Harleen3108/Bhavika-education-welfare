import { revalidatePath } from "next/cache";
import type { Types } from "mongoose";
import { handle, ok, DomainError } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { dbConnect } from "@/server/db/connect";
import { Quiz, type IQuizQuestion } from "@/server/models";
import { logAdminAction } from "@/server/services/audit.service";
import {
  QUIZ_IMPORT,
  QUIZ_IMPORT_PREVIEW_ROWS,
  parseQuizCsv,
  questionKey,
  quizImportRequestSchema,
  type QuizImportIssue,
  type QuizImportPreviewRow,
  type QuizImportRequest,
  type QuizImportResult,
} from "@/lib/validation/quiz";
import { QUESTION_BANK, pickBankQuestions, toQuizQuestions } from "@/lib/question-bank";

export const runtime = "nodejs";

/**
 * Bulk question authoring for one quiz — a CSV the admin uploads, or a draw
 * from the built-in bilingual question bank when they have no sheet to upload.
 *
 * Both paths land here because both answer the same three questions: which
 * questions, replacing or appending, and does the quiz already have them. The
 * rules that matter:
 *
 *  - The server parses and validates the file itself. The dialog shows a
 *    preview, but that preview IS this endpoint's dry run (`commit: false`) —
 *    the browser never decides whether a row is acceptable, so a hand-rolled
 *    request cannot smuggle in a row the preview would have rejected.
 *  - All or nothing. One bad row on line 40 fails the whole import with that
 *    line number; 39 good questions are not quietly written first.
 *  - Re-importing the same file is safe. Append skips questions the quiz
 *    already holds, and replace reuses the existing subdocument `_id` for any
 *    question whose text is unchanged, so the second run is a no-op rather
 *    than a churn of new ids.
 */

/** A question ready to store, before it is given an order and an id. */
type Candidate = {
  /** Line in the uploaded file; for a bank draw, the position in the draw. */
  line: number;
  text: string;
  options: string[];
  correctIndex: number;
  points: number;
};

type Prepared = {
  candidates: Candidate[];
  issues: QuizImportIssue[];
  unknownColumns: string[];
};

function prepare(input: QuizImportRequest): Prepared {
  if (input.source === "bank") {
    /*
      No seed: the admin pressing the button twice should get a different paper,
      which is the whole point of "shuffled questions on different topics".
      pickBankQuestions spreads the draw across topics round-robin, so a ten
      question paper touches ten subjects before it repeats one.
    */
    const drawn = pickBankQuestions(input.count);
    const candidates = toQuizQuestions(drawn, input.points).map((q, i) => ({
      line: i + 1,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      points: q.points,
    }));

    const issues: QuizImportIssue[] = [];
    if (candidates.length < input.count) {
      issues.push({
        line: 1,
        message: `The question bank holds ${QUESTION_BANK.length} questions and ${input.count} were requested.`,
      });
    }
    return { candidates, issues, unknownColumns: [] };
  }

  const parsed = parseQuizCsv(input.csv);
  return {
    candidates: parsed.rows.map((row) => ({
      line: row.line,
      text: row.text,
      options: row.options,
      correctIndex: row.correctIndex,
      points: row.points,
    })),
    issues: parsed.issues,
    unknownColumns: parsed.unknownColumns,
  };
}

export const POST = handle(async (req) => {
  const admin = await requireAdmin();

  /*
    Two size gates. The header is a claim, not a fact, so it only buys us an
    early exit on an honest large upload; the measured byte length after
    reading is the one that actually holds. Both run before JSON.parse, which
    is the step that would turn a big body into a much bigger object graph.
  */
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > QUIZ_IMPORT.maxRequestBytes) {
    throw new DomainError("That file is too large to import.", 413, "TOO_LARGE");
  }

  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > QUIZ_IMPORT.maxRequestBytes) {
    throw new DomainError("That file is too large to import.", 413, "TOO_LARGE");
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new DomainError("The request could not be read.", 400, "BAD_REQUEST");
  }

  const input = quizImportRequestSchema.parse(body);

  await dbConnect();
  const quiz = await Quiz.findById(input.quizId);
  if (!quiz) throw new DomainError("That quiz no longer exists.", 404, "NO_QUIZ");

  const questions = quiz.questions as unknown as Types.DocumentArray<IQuizQuestion>;
  const existingCount = questions.length;

  /*
    Identity is the question text, normalised the same way the bank and the CSV
    parser normalise it (see questionKey). Two admins uploading the same sheet
    from different machines produce the same keys, which is what makes a repeat
    import a no-op instead of a duplicate.
  */
  const existingIds = new Map<string, Types.ObjectId>();
  for (const q of questions) {
    const key = questionKey(q.text);
    if (key && !existingIds.has(key)) existingIds.set(key, q._id);
  }

  const { candidates, issues, unknownColumns } = prepare(input);

  const duplicates = candidates.filter((c) => existingIds.has(questionKey(c.text)));
  const additions =
    input.mode === "replace"
      ? candidates
      : candidates.filter((c) => !existingIds.has(questionKey(c.text)));

  const totalAfter =
    input.mode === "replace" ? candidates.length : existingCount + additions.length;

  if (candidates.length > 0 && totalAfter > QUIZ_IMPORT.maxQuestionsPerQuiz) {
    issues.push({
      line: 1,
      message:
        `This would leave the quiz with ${totalAfter} questions and the limit is ${QUIZ_IMPORT.maxQuestionsPerQuiz}. ` +
        (input.mode === "append"
          ? "Import fewer questions, or use Replace instead of Append."
          : "Split the questions across two quizzes."),
    });
  }

  const preview: QuizImportPreviewRow[] = candidates
    .slice(0, QUIZ_IMPORT_PREVIEW_ROWS)
    .map((c) => ({
      line: c.line,
      text: c.text,
      options: c.options,
      correctIndex: c.correctIndex,
      points: c.points,
      duplicate: existingIds.has(questionKey(c.text)),
    }));

  const result: QuizImportResult = {
    valid: issues.length === 0,
    committed: false,
    source: input.source,
    mode: input.mode,
    existingCount,
    parsedCount: candidates.length,
    duplicateCount: duplicates.length,
    addCount: additions.length,
    removedCount: input.mode === "replace" ? existingCount : 0,
    totalAfter: issues.length === 0 ? totalAfter : existingCount,
    issues,
    unknownColumns,
    preview,
    previewTruncated: Math.max(0, candidates.length - preview.length),
  };

  // A dry run answers with the same arithmetic the write would use, and stops.
  if (!input.commit) return ok(result);

  if (issues.length > 0) {
    return ok(
      {
        ...result,
        error:
          issues.length === 1
            ? "The import was not applied — one row needs fixing."
            : `The import was not applied — ${issues.length} rows need fixing.`,
      },
      { status: 422 },
    );
  }

  if (input.mode === "replace") {
    /*
      Reuse the id of any question whose text is unchanged. A member's attempt
      records answers by question id, so minting fresh ids for questions that
      did not change would orphan the answers of anyone mid-attempt — and would
      make re-importing an unchanged sheet look like a rewrite in the database.
    */
    const replacement = candidates.map((c, i) => {
      const existingId = existingIds.get(questionKey(c.text));
      return {
        ...(existingId ? { _id: existingId } : {}),
        text: c.text,
        options: c.options,
        correctIndex: c.correctIndex,
        points: c.points,
        order: i + 1,
      };
    });
    quiz.set("questions", replacement);
  } else {
    // Continue the existing numbering rather than restarting it; the editor
    // and the runner both sort on `order`.
    const highestOrder = questions.reduce((max, q) => Math.max(max, q.order ?? 0), 0);
    additions.forEach((c, i) => {
      questions.push({
        text: c.text,
        options: c.options,
        correctIndex: c.correctIndex,
        points: c.points,
        order: highestOrder + i + 1,
      } as unknown as IQuizQuestion);
    });
  }

  // Document save (not a raw update) so the model's own validators — option
  // count, correctIndex range, field lengths — run on every question written.
  await quiz.save();

  await logAdminAction(admin.id, "quiz.questions.import", {
    targetType: "Quiz",
    targetId: input.quizId,
    reason: `${input.source} ${input.mode}: +${additions.length} question(s)`,
    meta: {
      source: input.source,
      mode: input.mode,
      existingCount,
      added: additions.length,
      skippedDuplicates: input.mode === "append" ? duplicates.length : 0,
      totalAfter: quiz.questions.length,
    },
  });

  revalidatePath("/admin/quizzes");
  revalidatePath(`/admin/quizzes/${input.quizId}`);
  revalidatePath("/dashboard/quizzes");
  revalidatePath("/dashboard");

  // Read the length back off the document: `replace` swaps the array wholesale,
  // so the count the write produced is the only one worth reporting.
  return ok({ ...result, committed: true, totalAfter: quiz.questions.length });
});
