"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, Eye } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { setContactStatus } from "@/server/actions/contacts";
import { ContactStatus } from "@/lib/enums";
import { formatDateTime } from "@/lib/utils";

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

function tone(s: string) {
  return s === ContactStatus.NEW ? "warning" : s === ContactStatus.RESPONDED ? "success" : s === ContactStatus.SPAM ? "danger" : "neutral";
}

export function ContactsTable({ items }: { items: Contact[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Contact | null>(null);

  const setStatus = async (id: string, status: string) => {
    const res = await setContactStatus({ id, status });
    if (!res.ok) return toast.error(res.error);
    toast.success("Status updated.");
    setSelected((s) => (s ? { ...s, status } : s));
    router.refresh();
  };

  if (items.length === 0) {
    return <EmptyState icon={<Mail size={36} />} title="No messages" description="Contact form submissions will appear here." />;
  }

  return (
    <>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-ink-500">
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 text-right font-medium">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-800">{c.name}</p>
                    <p className="text-xs text-ink-400">{c.email}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{c.subject || "—"}</td>
                  <td className="px-4 py-3"><Badge tone={tone(c.status)}>{c.status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-ink-400">{formatDateTime(c.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected(c)} className="rounded-lg p-2 text-ink-500 hover:bg-brand-50 hover:text-brand-700" aria-label="View">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Message" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-ink-500">Name:</span> <span className="font-medium">{selected.name}</span></p>
              <p><span className="text-ink-500">Email:</span> <a href={`mailto:${selected.email}`} className="text-brand-600 underline">{selected.email}</a></p>
              {selected.phone && <p><span className="text-ink-500">Phone:</span> {selected.phone}</p>}
              {selected.subject && <p><span className="text-ink-500">Subject:</span> {selected.subject}</p>}
            </div>
            <div className="rounded-xl bg-ink-50 p-4 text-sm text-ink-700 whitespace-pre-wrap">{selected.message}</div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">Set status</p>
              <div className="flex flex-wrap gap-2">
                {Object.values(ContactStatus).map((s) => (
                  <Button key={s} size="sm" variant={selected.status === s ? "primary" : "subtle"} onClick={() => setStatus(selected.id, s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || "Your enquiry")}`} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                <Mail size={16} /> Reply by email
              </a>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
