import * as React from "react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-xl border border-ink-300 bg-white px-4 py-2.5 text-base text-ink-900 " +
  "placeholder:text-ink-400 shadow-sm transition-colors focus:border-brand-500 " +
  "focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-ink-100 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-red-100";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(controlBase, className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(controlBase, "min-h-28 resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(controlBase, "pr-10", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-ink-800", className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 text-sm text-danger" role="alert">
      {children}
    </p>
  );
}

/** Full labelled field wrapper. */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {hint && !error && <p className="mt-1.5 text-sm text-ink-500">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
}
