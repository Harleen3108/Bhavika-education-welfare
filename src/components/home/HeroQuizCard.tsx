"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Clock, Sparkles, Trophy, X } from "lucide-react";
import { Hi } from "@/components/ui/Bilingual";
import { CountUp } from "@/components/motion";
import { SAMPLE_QUESTION } from "@/lib/site-content";
import { cn } from "@/lib/utils";

/** Points a correct answer is worth, mirrored in the reward copy below. */
const POINTS_PER_CORRECT = 10;

/**
 * A real, playable sample question in the hero.
 *
 * The single most common complaint about the old homepage was that the daily
 * quiz — the entire selling point — was described in prose but never shown.
 * Letting a visitor answer one question before registering demonstrates the
 * product in about four seconds.
 */
export function HeroQuizCard() {
  const [picked, setPicked] = React.useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === SAMPLE_QUESTION.correctIndex;

  return (
    <div className="rounded-3xl border border-ink-200 bg-surface p-5 shadow-card-hover sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-[0.6875rem] font-semibold tracking-wide text-brand-700 uppercase">
          <Sparkles size={13} /> Try one question
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500">
          <Clock size={14} /> {SAMPLE_QUESTION.category}
          <Hi inline>{SAMPLE_QUESTION.categoryHi}</Hi>
        </span>
      </div>

      <p className="mt-4 text-lg font-semibold text-ink-900">{SAMPLE_QUESTION.q}</p>
      <Hi className="mt-1 block text-ink-600">{SAMPLE_QUESTION.qHi}</Hi>

      <ul className="mt-4 flex flex-col gap-2">
        {SAMPLE_QUESTION.options.map((opt, i) => {
          const isCorrect = i === SAMPLE_QUESTION.correctIndex;
          const isPicked = i === picked;
          // After answering, always reveal the correct option — including when
          // the visitor picked wrong — so the card teaches rather than scolds.
          const reveal = answered && (isPicked || isCorrect);

          return (
            <li key={opt.en}>
              <button
                type="button"
                onClick={() => setPicked(i)}
                disabled={answered}
                aria-label={`${opt.en}${answered ? (isCorrect ? " — correct answer" : "") : ""}`}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                  "disabled:cursor-default",
                  !answered && "border-ink-200 hover:border-brand-300 hover:bg-brand-50/60",
                  reveal && isCorrect && "border-accent-400 bg-accent-50",
                  reveal && !isCorrect && "border-rose-glow-400 bg-rose-50",
                  answered && !reveal && "border-ink-200 opacity-50",
                )}
              >
                <span className="flex items-baseline gap-2">
                  <span className="font-medium text-ink-900">{opt.en}</span>
                  <Hi inline className="text-ink-500">
                    {opt.hi}
                  </Hi>
                </span>
                {reveal && (
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white",
                      isCorrect ? "bg-accent-500" : "bg-rose-glow-500",
                    )}
                  >
                    {isCorrect ? <Check size={14} /> : <X size={14} />}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* aria-live so the result is announced, not just shown */}
      <div aria-live="polite" className="min-h-0">
        {answered && (
          <div className="animate-fade-up mt-4 rounded-xl bg-ink-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-ink-900">
                {correct
                  ? "Correct — points credited to your wallet."
                  : "Not quite — Mars is the Red Planet."}
              </p>
              {correct && (
                // The counter is the payoff of the whole card: the visitor sees
                // a balance move before they have signed up for anything.
                <span className="bg-gradient-cta inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white">
                  <Trophy aria-hidden size={12} />+
                  <CountUp to={POINTS_PER_CORRECT} duration={0.8} /> pts
                </span>
              )}
            </div>
            <Hi className="mt-0.5 block text-sm text-ink-600">
              {correct
                ? "सही जवाब! रोज़ खेलकर और पॉइंट्स कमाओ।"
                : "कोई बात नहीं — रोज़ खेलो, रोज़ सीखो।"}
            </Hi>
            <Link
              href="/register"
              className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:text-brand-700"
            >
              Play the full daily quiz →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
