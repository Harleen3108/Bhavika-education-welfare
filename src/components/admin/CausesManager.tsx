"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { saveCauseAction, deleteCauseAction } from "@/server/actions/donations";

type Cause = { id: string; name: string; nameHi: string; description: string; active: boolean; order: number };

export function CausesManager({ causes }: { causes: Cause[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<string | "new" | null>(null);
  const [busy, setBusy] = React.useState(false);

  const save = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await saveCauseAction(payload);
      if (!res.ok) return toast.error(res.error);
      toast.success("Cause saved.");
      setEditing(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const res = await deleteCauseAction({ id });
      if (!res.ok) return toast.error(res.error);
      toast.success("Cause removed.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Causes</h2>
          {editing !== "new" && (
            <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
              <Plus size={14} /> Add cause
            </Button>
          )}
        </div>

        {editing === "new" && (
          <CauseEditor busy={busy} onCancel={() => setEditing(null)} onSave={save} />
        )}

        <ul className="mt-3 divide-y divide-ink-100">
          {causes.length === 0 && editing !== "new" && (
            <li className="py-6 text-center text-sm text-ink-500">
              No causes yet — add one so donors have something to give to.
            </li>
          )}
          {causes.map((c) =>
            editing === c.id ? (
              <li key={c.id} className="py-3">
                <CauseEditor cause={c} busy={busy} onCancel={() => setEditing(null)} onSave={save} />
              </li>
            ) : (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-900">{c.name}</span>
                    {c.nameHi && <span className="text-sm text-ink-500">{c.nameHi}</span>}
                    <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Active" : "Hidden"}</Badge>
                  </div>
                  {c.description && <p className="text-xs text-ink-500">{c.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => save({ id: c.id, name: c.name, nameHi: c.nameHi, description: c.description, order: c.order, active: !c.active })}
                    disabled={busy}
                  >
                    {c.active ? "Hide" : "Show"}
                  </Button>
                  <Button size="sm" variant="subtle" onClick={() => setEditing(c.id)} disabled={busy}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="sm" variant="subtle" onClick={() => remove(c.id)} disabled={busy}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </li>
            ),
          )}
        </ul>
      </CardBody>
    </Card>
  );
}

function CauseEditor({
  cause,
  busy,
  onCancel,
  onSave,
}: {
  cause?: Cause;
  busy: boolean;
  onCancel: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const [name, setName] = React.useState(cause?.name ?? "");
  const [nameHi, setNameHi] = React.useState(cause?.nameHi ?? "");
  const [description, setDescription] = React.useState(cause?.description ?? "");
  const [order, setOrder] = React.useState(String(cause?.order ?? 0));

  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input placeholder="Cause name (e.g. Food donation)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Hindi name (optional)" value={nameHi} onChange={(e) => setNameHi(e.target.value)} />
        <Input placeholder="Short description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="sm:col-span-2" />
        <Input type="number" min={0} placeholder="Order" value={order} onChange={(e) => setOrder(e.target.value)} className="w-28" />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <Button size="sm" variant="subtle" onClick={onCancel} disabled={busy}>
          <X size={14} /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onSave({ ...(cause ? { id: cause.id } : {}), name, nameHi, description, order: Number(order) || 0, active: cause?.active ?? true })}
          loading={busy}
          disabled={name.trim().length < 2}
        >
          <Check size={14} /> Save
        </Button>
      </div>
    </div>
  );
}
