"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input, Textarea, Label } from "@/components/ui/Field";

export function StringListEditor({
  label,
  values,
  onChange,
  multiline,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  multiline?: boolean;
}) {
  const update = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    onChange(next);
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="space-y-2">
        {values.map((val, i) => (
          <div key={i} className="flex gap-2">
            {multiline ? (
              <Textarea value={val} onChange={(e) => update(i, e.target.value)} className="min-h-16" />
            ) : (
              <Input value={val} onChange={(e) => update(i, e.target.value)} />
            )}
            <button
              type="button"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              className="shrink-0 rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-[--color-danger]"
              aria-label="Remove"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        <Plus size={14} /> Add item
      </button>
    </div>
  );
}

type ObjItem = Record<string, string>;

export function ObjectListEditor({
  label,
  fields,
  values,
  onChange,
}: {
  label: string;
  fields: { name: string; label: string; multiline?: boolean }[];
  values: ObjItem[];
  onChange: (v: ObjItem[]) => void;
}) {
  const update = (i: number, key: string, v: string) => {
    const next = values.map((item, idx) => (idx === i ? { ...item, [key]: v } : item));
    onChange(next);
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="space-y-3">
        {values.map((item, i) => (
          <div key={i} className="rounded-xl border border-ink-200 p-3">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => onChange(values.filter((_, idx) => idx !== i))}
                className="rounded-lg p-1.5 text-ink-500 hover:bg-red-50 hover:text-[--color-danger]"
                aria-label="Remove"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((f) => (
                <div key={f.name}>
                  <span className="mb-1 block text-xs font-medium text-ink-500">{f.label}</span>
                  {f.multiline ? (
                    <Textarea
                      value={item[f.name] ?? ""}
                      onChange={(e) => update(i, f.name, e.target.value)}
                      className="min-h-16"
                    />
                  ) : (
                    <Input value={item[f.name] ?? ""} onChange={(e) => update(i, f.name, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...values, Object.fromEntries(fields.map((f) => [f.name, ""]))])}
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        <Plus size={14} /> Add
      </button>
    </div>
  );
}
