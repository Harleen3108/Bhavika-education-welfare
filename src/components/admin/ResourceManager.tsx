"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, Minus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea, Label, FieldError } from "@/components/ui/Field";
import { Modal, ConfirmButton } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { ImageUploader } from "@/components/admin/ImageUploader";

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "url" | "number" | "image" | "checkbox";
  required?: boolean;
  placeholder?: string;
};

export type ColumnDef<T> = {
  key: keyof T | "active";
  label: string;
  render?: (item: T) => React.ReactNode;
};

type Item = Record<string, unknown> & { id: string };
type ActionResult = { ok: true; data?: unknown } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ResourceManager<T extends Item>({
  title,
  singular,
  items,
  fields,
  columns,
  onSave,
  onDelete,
  defaults,
}: {
  title: string;
  singular: string;
  items: T[];
  fields: FieldDef[];
  columns: ColumnDef<T>[];
  onSave: (input: unknown, id?: string) => Promise<ActionResult>;
  onDelete: (id: string) => Promise<ActionResult>;
  defaults?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | undefined>(undefined);
  const [values, setValues] = React.useState<Record<string, unknown>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const openNew = () => {
    setEditingId(undefined);
    setValues({ order: 0, active: true, ...defaults });
    setErrors({});
    setOpen(true);
  };
  const openEdit = (item: T) => {
    setEditingId(item.id);
    setValues({ ...item });
    setErrors({});
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const res = await onSave(values, editingId);
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(`${singular} saved.`);
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const res = await onDelete(id);
    if (!res.ok) return toast.error(res.error);
    toast.success(`${singular} deleted.`);
    router.refresh();
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openNew} size="sm">
          <Plus size={16} /> Add {singular}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} yet`} description={`Add your first ${singular.toLowerCase()}.`} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-ink-500">
                  {columns.map((c) => (
                    <th key={String(c.key)} className="px-4 py-3 font-medium">{c.label}</th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-ink-50/50">
                    {columns.map((c) => (
                      <td key={String(c.key)} className="px-4 py-3 text-ink-700">
                        {c.render ? c.render(item) : renderCell(item[c.key as string])}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-2 text-ink-500 hover:bg-brand-50 hover:text-brand-700"
                          aria-label="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <ConfirmButton
                          onConfirm={() => remove(item.id)}
                          className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-danger"
                        >
                          <Trash2 size={16} />
                        </ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`${editingId ? "Edit" : "Add"} ${singular}`} size="lg">
        <div className="space-y-4">
          {fields.map((f) => (
            <FieldControl
              key={f.name}
              field={f}
              value={values[f.name]}
              error={errors[f.name]}
              onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
            />
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="subtle" onClick={() => setOpen(false)} type="button">Cancel</Button>
            <Button onClick={save} loading={saving} type="button">Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function renderCell(v: unknown): React.ReactNode {
  if (typeof v === "boolean") {
    return v ? (
      <Badge tone="success"><Check size={12} /> Active</Badge>
    ) : (
      <Badge tone="neutral"><Minus size={12} /> Hidden</Badge>
    );
  }
  const s = String(v ?? "");
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
}

function FieldControl({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
}) {
  if (field.type === "image") {
    return <ImageUploader label={field.label} value={String(value ?? "")} onChange={onChange} />;
  }
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2.5 text-sm font-medium text-ink-800">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
        />
        {field.label}
      </label>
    );
  }
  if (field.type === "textarea") {
    return (
      <div>
        <Label required={field.required}>{field.label}</Label>
        <Textarea
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
        />
        <FieldError>{error}</FieldError>
      </div>
    );
  }
  return (
    <div>
      <Label required={field.required}>{field.label}</Label>
      <Input
        type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
        value={String(value ?? "")}
        placeholder={field.placeholder}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
        aria-invalid={!!error}
      />
      <FieldError>{error}</FieldError>
    </div>
  );
}
