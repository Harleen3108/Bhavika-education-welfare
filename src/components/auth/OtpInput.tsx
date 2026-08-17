"use client";

import * as React from "react";
import { Hi } from "@/components/ui/Bilingual";
import { cn } from "@/lib/utils";

const LENGTH = 6;
const BOXES = Array.from({ length: LENGTH }, (_, i) => i);

const digitsOnly = (s: string) => s.replace(/\D/g, "");

/**
 * Select the contents of `el`, but only while it genuinely holds the caret.
 * Two reasons for the guard: `focus` fires synchronously and `handleFocus` may
 * have bounced the caret to an earlier box, and Chrome pulls focus onto whatever
 * element `select()` is called on — so an unguarded select would silently undo
 * that bounce.
 */
function selectIfFocused(el: HTMLInputElement) {
  if (document.activeElement === el) el.select();
}

/** Lets the form put the cursor back on the first box after a rejected code. */
export type OtpInputHandle = { focus: () => void };

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fires the moment the sixth digit lands, so the form can submit itself. */
  onComplete?: (value: string) => void;
  label: string;
  labelHi?: string;
  hint?: string;
  hintHi?: string;
  error?: string;
  errorHi?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Six-box one-time-code entry.
 *
 * `value` is kept as a compact string — index `i` is box `i`, and there are
 * never holes in the middle. Focus therefore always lands on the first empty
 * box, which is also what makes backspace and paste behave predictably.
 */
export const OtpInput = React.forwardRef<OtpInputHandle, OtpInputProps>(
  function OtpInput(
    {
      value,
      onChange,
      onComplete,
      label,
      labelHi,
      hint,
      hintHi,
      error,
      errorHi,
      disabled,
      autoFocus,
    },
    ref,
  ) {
    const boxes = React.useRef<Array<HTMLInputElement | null>>([]);
    const uid = React.useId();
    const labelId = `${uid}-label`;
    const errorId = `${uid}-error`;
    const hintId = `${uid}-hint`;

    /**
     * The code as it stands *right now*, which is not the same thing as the
     * `value` prop an event handler can see.
     *
     * Moving the caret dispatches `focus` synchronously, inside the same
     * handler that just accepted a digit — long before React has re-rendered
     * with it. The handler that receives that `focus` belongs to the previous
     * render, so its `value` is one digit short, and it concludes the caret has
     * run past the end of the code and bounces it back. That bounce was the
     * auto-advance bug. Every handler reads the code from here instead:
     * `commit` writes it forward before it moves focus, and the effect below
     * re-syncs it to whatever the parent actually stored.
     */
    const committed = React.useRef(value);

    // No dependency array on purpose. The invariant is "matches the value of
    // the last render", including renders where the parent changed the code
    // out from under us (a rejected code being cleared, say).
    React.useEffect(() => {
      committed.current = value;
    });

    /**
     * Put the caret on box `index`, clamped into range, and select whatever is
     * in it. The select is not cosmetic: `maxLength={1}` makes a full box with
     * a collapsed caret swallow keystrokes without firing `change` at all.
     */
    const focusBox = React.useCallback((index: number) => {
      const el = boxes.current[Math.min(Math.max(index, 0), LENGTH - 1)];
      if (!el) return;
      el.focus();
      selectIfFocused(el);
    }, []);

    React.useImperativeHandle(ref, () => ({ focus: () => focusBox(0) }), [focusBox]);

    /** Apply a new code, move the caret, and tell the form when it is complete. */
    const commit = (next: string, caret: number) => {
      const clean = digitsOnly(next).slice(0, LENGTH);
      // Before `onChange`, and above all before `focusBox`: the `focus` handler
      // fires inside that call and has to see the code as it is about to be.
      committed.current = clean;
      onChange(clean);
      focusBox(caret);
      if (clean.length === LENGTH) onComplete?.(clean);
    };

    const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const current = committed.current;
      const raw = e.target.value;
      const typed = digitsOnly(raw);

      if (!typed && raw) {
        // Something non-numeric slipped past the key filter — an IME, or a
        // paste from an odd source. React's value has not changed so it will
        // not re-render: put the box back by hand instead of leaving a stray
        // character on screen, and above all do not treat it as a deletion.
        e.target.value = current[index] ?? "";
        return;
      }

      // Cleared the box: drop this digit and everything after it, so the value
      // stays hole-free.
      if (!typed) {
        commit(current.slice(0, index), index);
        return;
      }

      // A whole code arrived at once — mobile OTP autofill, or a paste the
      // browser routed through onChange rather than the paste event.
      if (typed.length >= LENGTH) {
        commit(typed, LENGTH - 1);
        return;
      }

      const next = current.slice(0, index) + typed + current.slice(index + typed.length);
      commit(next, index + typed.length);
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      const current = committed.current;
      // Paste, select-all and the like keep their default behaviour.
      const combo = e.ctrlKey || e.metaKey || e.altKey;

      // Digits are applied here rather than handed to the browser. These boxes
      // are controlled and `maxLength={1}`, so whether a keystroke even reaches
      // `change` depends on the caret sitting on a selection rather than after
      // the digit already in the box — and the caret is exactly what a
      // controlled re-render is entitled to move. Owning the keystroke makes
      // "type a digit, advance one box" independent of selection state.
      // Soft keyboards that report `Unidentified` here (Android, mostly) are
      // longer than one character, fall through, and land in `handleChange`,
      // which reaches the same `commit`.
      if (!combo && /^\d$/.test(e.key)) {
        e.preventDefault();
        commit(current.slice(0, index) + e.key + current.slice(index + 1), index + 1);
        return;
      }

      // Any other printable character is dropped before it reaches the box, so
      // a stray letter can never desync the controlled value. Named keys (Tab,
      // Enter, arrows) are longer than one character and pass through — Tab in
      // particular must stay untouched or the group becomes a keyboard trap.
      if (!combo && e.key.length === 1) {
        e.preventDefault();
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        // An empty box hands the delete to the box before it, so holding
        // backspace walks the code away one digit at a time.
        const target = current[index] ? index : index - 1;
        if (target < 0) return;
        commit(current.slice(0, target), target);
        return;
      }
      if (e.key === "Delete") {
        e.preventDefault();
        commit(current.slice(0, index), index);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        focusBox(index - 1);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        focusBox(index + 1);
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        focusBox(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        focusBox(current.length);
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = digitsOnly(e.clipboardData.getData("text"));
      if (!pasted) return;
      // A full code fills every box no matter which one received the paste; a
      // partial one leaves the caret on the next box still waiting.
      e.preventDefault();
      commit(pasted, Math.min(pasted.length, LENGTH - 1));
    };

    const handleFocus = (index: number, e: React.FocusEvent<HTMLInputElement>) => {
      // Typing into box 5 while box 3 is empty would leave a hole, so send the
      // caret to the first box still waiting for a digit. `committed` and not
      // `value`, or this bounces the caret off the digit that was just typed.
      if (index > committed.current.length) {
        focusBox(committed.current.length);
        return;
      }
      selectIfFocused(e.currentTarget);
    };

    const describedBy = error ? errorId : hint ? hintId : undefined;

    // The six boxes are one composite widget with a single tab stop, on the box
    // that is next in line. Without this, Tab would move focus onto a box past
    // the first empty one, `handleFocus` would bounce it straight back, and a
    // keyboard user could never reach the submit button below. Programmatic
    // focus ignores tabIndex entirely, so auto-advance is unaffected.
    const tabStop = Math.min(value.length, LENGTH - 1);

    return (
      <div>
        <label
          id={labelId}
          htmlFor={`${uid}-0`}
          className="mb-2 block text-sm font-medium text-ink-800"
        >
          {label}
          {labelHi && <Hi inline className="ml-1.5">{labelHi}</Hi>}
        </label>

        <div role="group" aria-labelledby={labelId} className="grid grid-cols-6 gap-2 sm:gap-2.5">
          {BOXES.map((i) => (
            <input
              key={i}
              id={`${uid}-${i}`}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              // Only the first box carries the hint; the browser then spreads a
              // received code across the rest through the multi-digit path.
              autoComplete={i === 0 ? "one-time-code" : "off"}
              autoFocus={autoFocus && i === 0}
              tabIndex={i === tabStop ? 0 : -1}
              disabled={disabled}
              value={value[i] ?? ""}
              aria-label={`Digit ${i + 1} of ${LENGTH}`}
              aria-invalid={!!error}
              aria-describedby={describedBy}
              onChange={(e) => handleChange(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={(e) => handleFocus(i, e)}
              // A click lands the caret after `focus` has run, collapsing the
              // selection that `handleFocus` just made — which would leave a
              // full box unable to accept a replacement digit.
              onClick={(e) => selectIfFocused(e.currentTarget)}
              className={cn(
                "font-display h-13 w-full rounded-xl border bg-white text-center text-2xl font-semibold text-ink-900 shadow-sm transition-colors",
                "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200",
                value[i] ? "border-brand-300 bg-brand-50/70" : "border-ink-300",
                error && "border-danger bg-red-50/40",
                disabled && "bg-ink-100 text-ink-400 shadow-none",
              )}
            />
          ))}
        </div>

        {hint && !error && (
          <p id={hintId} className="mt-2 text-sm text-ink-500">
            {hint}
            {hintHi && <Hi inline className="ml-1.5">{hintHi}</Hi>}
          </p>
        )}

        {/* Mounted even when empty so assistive tech announces the change. */}
        <div aria-live="assertive">
          {error && (
            <div id={errorId} className="mt-2">
              <p className="text-sm text-danger">{error}</p>
              {errorHi && (
                <Hi className="mt-0.5 block text-[0.8rem] text-danger">{errorHi}</Hi>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);
