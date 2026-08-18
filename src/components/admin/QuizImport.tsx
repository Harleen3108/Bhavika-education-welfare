"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Download,
  FileSpreadsheet,
  Shuffle,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Field";
import { Alert } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import {
  QUIZ_IMPORT,
  QUIZ_IMPORT_COLUMNS,
  QUIZ_IMPORT_MODES,
  sampleCsvFileContent,
  type QuizImportMode,
  type QuizImportResult,
} from "@/lib/validation/quiz";
import { cn } from "@/lib/utils";

type ImportResponse = Partial<QuizImportResult> & { error?: string; code?: string };

/** A parsed result, as opposed to an auth/size/server failure. */
function isResult(data: ImportResponse): data is QuizImportResult {
  return typeof data.parsedCount === "number" && Array.isArray(data.issues);
}

const MODE_LABELS: Record<QuizImportMode, string> = {
  replace: "Replace all questions",
  append: "Add to the existing questions",
};

const ENDPOINT = "/api/admin/quizzes/import";
const SAMPLE_FILENAME = "bhavika-quiz-questions-sample.csv";
const ISSUES_SHOWN = 20;

function kb(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Bulk question authoring: upload a sheet, or draw from the question bank.
 *
 * The dialog never decides anything. Every count on screen — how many rows
 * parsed, how many the quiz already has, what the quiz will hold afterwards —
 * comes back from the import endpoint's dry run, and pressing Apply re-sends
 * the same file for the same validation. So the preview cannot promise an
 * outcome the write then declines to deliver, and an admin who reloads
 * mid-flow simply gets a fresh preview rather than a half-applied sheet.
 */
export function QuizImport({
  quizId,
  existingCount,
  bankSize,
  bankTopicCount,
}: {
  quizId: string;
  existingCount: number;
  bankSize: number;
  bankTopicCount: number;
}) {
  const router = useRouter();

  const [mode, setMode] = React.useState<QuizImportMode>(
    existingCount === 0 ? "replace" : "append",
  );
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [csv, setCsv] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<QuizImportResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  /** What the last successful write did — a toast is gone before it is read. */
  const [done, setDone] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"preview" | "commit" | "bank" | null>(null);

  const [bankCount, setBankCount] = React.useState("10");
  const wantedFromBank = Number(bankCount);
  const bankCountValid =
    Number.isInteger(wantedFromBank) && wantedFromBank >= 1 && wantedFromBank <= bankSize;

  const post = async (
    body: Record<string, unknown>,
  ): Promise<{ ok: boolean; data: ImportResponse }> => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId, mode, ...body }),
    });
    const data = (await res.json()) as ImportResponse;
    return { ok: res.ok, data };
  };

  const clearFile = () => {
    setFileName(null);
    setCsv(null);
    setResult(null);
    setError(null);
  };

  /** Clear the last outcome as soon as the admin starts a new one. */
  const startOver = () => {
    clearFile();
    setDone(null);
  };

  /** Dry run. Called on pick and whenever the mode changes, never from an effect. */
  const preview = async (text: string, forMode: QuizImportMode) => {
    setBusy("preview");
    setError(null);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, mode: forMode, source: "csv", csv: text, commit: false }),
      });
      const data = (await res.json()) as ImportResponse;
      if (isResult(data)) {
        setResult(data);
        return;
      }
      setResult(null);
      setError(data.error ?? "The file could not be read. Please try again.");
    } catch {
      setResult(null);
      setError("The file could not be sent. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so re-picking the same file after an edit still fires.
    e.target.value = "";
    if (!file) return;

    startOver();

    if (/\.(xlsx|xls|ods|numbers)$/i.test(file.name)) {
      setFileName(file.name);
      setError(
        "Spreadsheet files are not read directly. Open it in Excel, choose File → Save As → CSV UTF-8, and upload that file.",
      );
      return;
    }
    if (file.size > QUIZ_IMPORT.maxBytes) {
      setError(
        `That file is ${kb(file.size)} and the limit is ${kb(QUIZ_IMPORT.maxBytes)}. Split it into smaller files.`,
      );
      return;
    }

    const text = await file.text();
    // An .xlsx renamed to .csv is still a zip; say so instead of reporting
    // every line of binary as a broken row.
    if (text.startsWith("PK")) {
      setFileName(file.name);
      setError(
        "That file is an Excel workbook with a .csv name. Open it in Excel and use File → Save As → CSV UTF-8.",
      );
      return;
    }

    setFileName(file.name);
    setCsv(text);
    await preview(text, mode);
  };

  const changeMode = async (next: QuizImportMode) => {
    setMode(next);
    setDone(null);
    // The counts on screen were computed for the old mode; re-ask rather than
    // leaving a preview that describes an outcome the admin is no longer choosing.
    if (csv) await preview(csv, next);
  };

  /** Replace throws away work that is already in the quiz — say so out loud. */
  const confirmDestructive = (nextMode: QuizImportMode): boolean => {
    if (nextMode !== "replace" || existingCount === 0) return true;
    return window.confirm(
      `This deletes the ${existingCount} question${existingCount === 1 ? "" : "s"} already in this quiz and replaces them. Continue?`,
    );
  };

  const apply = async () => {
    if (!csv || !result?.valid) return;
    if (!confirmDestructive(mode)) return;
    setBusy("commit");
    setError(null);
    try {
      const { ok, data } = await post({ source: "csv", csv, commit: true });
      if (!ok || !isResult(data)) {
        if (isResult(data)) setResult(data);
        setError(data.error ?? "The import was not applied. Please try again.");
        return;
      }
      const message =
        data.addCount === 0
          ? "Nothing to add — every question in that file is already in this quiz."
          : `${data.addCount} question${data.addCount === 1 ? "" : "s"} imported from ${fileName ?? "the file"}. The quiz now has ${data.totalAfter}.`;
      // Clear the sheet with the outcome, so the applied file cannot be applied
      // a second time by a stray click on a preview that no longer describes it.
      clearFile();
      setDone(message);
      toast.success(message);
      router.refresh();
    } catch {
      setError("The import could not be sent. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  const fillFromBank = async () => {
    if (!bankCountValid) return;
    if (!confirmDestructive(mode)) return;
    setBusy("bank");
    startOver();
    try {
      const { ok, data } = await post({
        source: "bank",
        count: wantedFromBank,
        points: 10,
        commit: true,
      });
      if (!ok || !isResult(data)) {
        setError(data.error ?? "The questions could not be added. Please try again.");
        return;
      }
      const message =
        data.addCount === 0
          ? "Nothing to add — those questions are already in this quiz."
          : `${data.addCount} question${data.addCount === 1 ? "" : "s"} added from the question bank. The quiz now has ${data.totalAfter}.`;
      setDone(message);
      toast.success(message);
      router.refresh();
    } catch {
      setError("The request could not be sent. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([sampleCsvFileContent()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = SAMPLE_FILENAME;
    link.click();
    URL.revokeObjectURL(url);
  };

  const working = busy !== null;

  return (
    <Card>
      <CardBody>
        <CardTitle>Add questions in bulk</CardTitle>
        <p className="mt-1 text-sm text-ink-600">
          Upload a CSV sheet of questions, or fill the quiz from the built-in question bank.
        </p>

        {done && (
          <Alert tone="success" className="mt-4">
            {done}
          </Alert>
        )}

        {/* ------------------------------ mode ------------------------------ */}
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium text-ink-800">
            What should happen to the questions already here?
          </legend>
          <div className="space-y-2">
            {QUIZ_IMPORT_MODES.map((m) => (
              <label
                key={m}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                  mode === m
                    ? "border-brand-400 bg-brand-50"
                    : "border-ink-200 bg-surface hover:border-ink-300",
                )}
              >
                <input
                  type="radio"
                  name="quiz-import-mode"
                  value={m}
                  checked={mode === m}
                  disabled={working}
                  onChange={() => void changeMode(m)}
                  className="h-5 w-5 shrink-0 accent-brand-700"
                />
                <span className="text-sm">
                  <span className="block font-medium text-ink-900">{MODE_LABELS[m]}</span>
                  <span className="block text-ink-600">
                    {m === "replace"
                      ? existingCount === 0
                        ? "The quiz is empty, so the imported questions are all it will hold."
                        : `The ${existingCount} question${existingCount === 1 ? "" : "s"} here now will be deleted.`
                      : "Questions this quiz already has are skipped, so importing twice adds nothing twice."}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ------------------------------ CSV ------------------------------- */}
        <div className="mt-6 border-t border-ink-200 pt-5">
          <h4 className="text-sm font-semibold text-ink-900">1. Import from a CSV sheet</h4>
          <p className="mt-1 text-sm text-ink-600">
            Columns: <span className="font-medium text-ink-800">{QUIZ_IMPORT_COLUMNS.join(", ")}</span>.
            The Hindi columns and <span className="font-medium text-ink-800">points</span> are
            optional; <span className="font-medium text-ink-800">correct</span> is a, b, c or d.
            Up to {QUIZ_IMPORT.maxRows} rows and {kb(QUIZ_IMPORT.maxBytes)} per file.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <label
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full",
                "bg-brand-700 px-6 text-[0.9375rem] font-semibold text-white shadow-sm transition-colors",
                "hover:bg-brand-800 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600",
                working && "pointer-events-none opacity-60",
              )}
            >
              <Upload size={16} />
              {fileName ? "Choose another file" : "Choose CSV file"}
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                disabled={working}
                onChange={(e) => void onPick(e)}
              />
            </label>

            <Button type="button" variant="outline" onClick={downloadSample}>
              <Download size={16} /> Sample CSV
            </Button>
          </div>

          {fileName && (
            <div className="mt-3 flex min-h-11 items-center gap-2 rounded-xl bg-ink-100 px-3 py-2 text-sm">
              <FileSpreadsheet size={16} className="shrink-0 text-ink-500" />
              <span className="min-w-0 flex-1 truncate text-ink-800">{fileName}</span>
              <button
                type="button"
                onClick={startOver}
                disabled={working}
                className="-mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-white hover:text-danger"
                aria-label="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {busy === "preview" && (
            <p className="mt-3 text-sm text-ink-600">Checking the file…</p>
          )}

          {error && (
            <Alert tone="danger" className="mt-3">
              {error}
            </Alert>
          )}

          {result && <ImportPreview result={result} />}

          {/*
            The apply button exists only while an unapplied sheet is in hand: a
            successful import clears both, so there is nothing left to press
            twice. Its label states the outcome the server just calculated,
            which is the last thing the admin reads before committing.
          */}
          {result?.valid && csv && (
            <div className="mt-4">
              <Button
                type="button"
                onClick={() => void apply()}
                loading={busy === "commit"}
                disabled={working || (mode === "append" && result.addCount === 0)}
                className="w-full sm:w-auto"
              >
                {mode === "replace"
                  ? `Replace with ${result.parsedCount} question${result.parsedCount === 1 ? "" : "s"}`
                  : result.addCount === 0
                    ? "Nothing new to add"
                    : `Add ${result.addCount} question${result.addCount === 1 ? "" : "s"}`}
              </Button>
            </div>
          )}
        </div>

        {/* --------------------------- bank fill ---------------------------- */}
        <div className="mt-6 border-t border-ink-200 pt-5">
          <h4 className="text-sm font-semibold text-ink-900">2. Or fill from the question bank</h4>
          <p className="mt-1 text-sm text-ink-600">
            {bankSize} ready-made bilingual questions across {bankTopicCount} subjects. The draw is
            shuffled and spread across subjects, so a paper covers several topics rather than one.
          </p>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-40">
              <Label htmlFor="bank-count">How many?</Label>
              <Input
                id="bank-count"
                type="number"
                inputMode="numeric"
                min={1}
                max={bankSize}
                value={bankCount}
                disabled={working}
                onChange={(e) => setBankCount(e.target.value)}
                aria-invalid={!bankCountValid}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void fillFromBank()}
              loading={busy === "bank"}
              disabled={working || !bankCountValid}
              className="w-full sm:w-auto"
            >
              <Shuffle size={16} /> Fill from question bank
            </Button>
          </div>
          {!bankCountValid && (
            <p className="mt-1.5 text-sm text-danger" role="alert">
              Enter a number between 1 and {bankSize}.
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/* ========================================================================== */

function ImportPreview({ result }: { result: QuizImportResult }) {
  const {
    valid,
    mode,
    existingCount,
    parsedCount,
    duplicateCount,
    addCount,
    totalAfter,
    issues,
    unknownColumns,
    preview,
    previewTruncated,
  } = result;

  if (!valid) {
    const shown = issues.slice(0, ISSUES_SHOWN);
    return (
      <div className="mt-4">
        <Alert tone="danger" title={`This sheet has ${issues.length} problem${issues.length === 1 ? "" : "s"}`}>
          <p>Nothing has been imported. Fix these lines in your sheet and upload it again.</p>
          <ul className="mt-2 space-y-1.5">
            {shown.map((issue, i) => (
              <li key={`${issue.line}-${i}`} className="flex gap-2">
                <span className="shrink-0 font-semibold">Line {issue.line}</span>
                <span className="min-w-0">{issue.message}</span>
              </li>
            ))}
          </ul>
          {issues.length > shown.length && (
            <p className="mt-2 font-medium">
              …and {issues.length - shown.length} more.
            </p>
          )}
        </Alert>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <Alert tone={mode === "replace" && existingCount > 0 ? "warning" : "success"}>
        <p className="font-semibold">
          {parsedCount} question{parsedCount === 1 ? "" : "s"} read from the file.
        </p>
        <p className="mt-1">
          {mode === "replace"
            ? existingCount === 0
              ? `The quiz will hold these ${parsedCount}.`
              : `The ${existingCount} question${existingCount === 1 ? "" : "s"} in this quiz will be deleted and these ${parsedCount} will take their place.`
            : addCount === 0
              ? "Every one of them is already in this quiz — nothing would be added."
              : `${addCount} will be added after the ${existingCount} already here, leaving ${totalAfter}.`}
        </p>
        {duplicateCount > 0 && mode === "append" && (
          <p className="mt-1">
            {duplicateCount} question{duplicateCount === 1 ? " is" : "s are"} already in this quiz
            and will be skipped.
          </p>
        )}
      </Alert>

      {unknownColumns.length > 0 && (
        <Alert tone="warning">
          <span className="inline-flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              These columns were not recognised and will be ignored:{" "}
              <span className="font-medium">{unknownColumns.join(", ")}</span>.
            </span>
          </span>
        </Alert>
      )}

      <div className="space-y-2">
        {preview.map((row) => (
          <div key={row.line} className="rounded-xl border border-ink-200 bg-surface p-3">
            <div className="flex items-start justify-between gap-2">
              {/*
                wrap-anywhere, not break-words: a sheet cell can hold one
                unbreakable token (a URL, a chemical name), and
                `overflow-wrap: break-word` is defined not to shrink an
                element's min-content width. The row therefore kept its
                intrinsic width, the grid track grew with it, and previewing
                such a file scrolled the whole admin page sideways at 360px
                (measured: scrollWidth 842 against a 360 viewport).
              */}
              <p className="min-w-0 text-sm font-medium wrap-anywhere text-ink-900">
                <span className="text-ink-400">Line {row.line}.</span> {row.text}
              </p>
              {row.duplicate && (
                <Badge tone="neutral" className="shrink-0">
                  Already here
                </Badge>
              )}
            </div>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {row.options.map((opt, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-1.5",
                    i === row.correctIndex ? "font-medium text-success" : "text-ink-600",
                  )}
                >
                  {i === row.correctIndex ? (
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                  ) : (
                    <Circle size={14} className="mt-0.5 shrink-0 text-ink-300" />
                  )}
                  <span className="min-w-0 wrap-anywhere">{opt}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-400">{row.points} points</p>
          </div>
        ))}
        {previewTruncated > 0 && (
          <p className="text-sm text-ink-600">
            …and {previewTruncated} more question{previewTruncated === 1 ? "" : "s"} in the file.
          </p>
        )}
      </div>
    </div>
  );
}
