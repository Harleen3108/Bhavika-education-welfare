"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Textarea, Label } from "@/components/ui/Field";
import { StringListEditor, ObjectListEditor } from "@/components/admin/ListEditors";
import { saveContent } from "@/server/actions/content";
import { cn } from "@/lib/utils";

type AnyObj = Record<string, unknown>;

export function ContentManager({
  about,
  missionVision,
  contact,
}: {
  about: AnyObj;
  missionVision: AnyObj;
  contact: AnyObj;
}) {
  const [tab, setTab] = React.useState<"about" | "mission-vision" | "contact-info">("about");
  const tabs = [
    { key: "about", label: "About" },
    { key: "mission-vision", label: "Mission & Vision" },
    { key: "contact-info", label: "Contact info" },
  ] as const;

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "about" && <AboutForm initial={about} />}
      {tab === "mission-vision" && <MissionVisionForm initial={missionVision} />}
      {tab === "contact-info" && <ContactInfoForm initial={contact} />}
    </div>
  );
}

function useSaver(key: string) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const save = async (data: unknown) => {
    setSaving(true);
    try {
      const res = await saveContent(key, data);
      if (!res.ok) return toast.error(res.error);
      toast.success("Saved. Public pages updated.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };
  return { save, saving };
}

function AboutForm({ initial }: { initial: AnyObj }) {
  const { save, saving } = useSaver("about");
  const [v, setV] = React.useState({
    heading: String(initial.heading ?? ""),
    intro: String(initial.intro ?? ""),
    story: (initial.story as string[]) ?? [],
    objectives: (initial.objectives as string[]) ?? [],
    areas: (initial.areas as { title: string; body: string }[]) ?? [],
  });
  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <Label>Heading</Label>
          <Input value={v.heading} onChange={(e) => setV({ ...v, heading: e.target.value })} />
        </div>
        <div>
          <Label>Intro</Label>
          <Textarea value={v.intro} onChange={(e) => setV({ ...v, intro: e.target.value })} />
        </div>
        <StringListEditor label="Story paragraphs" values={v.story} onChange={(story) => setV({ ...v, story })} multiline />
        <StringListEditor label="Objectives" values={v.objectives} onChange={(objectives) => setV({ ...v, objectives })} />
        <ObjectListEditor
          label="Areas of work"
          fields={[{ name: "title", label: "Title" }, { name: "body", label: "Description", multiline: true }]}
          values={v.areas}
          onChange={(areas) => setV({ ...v, areas: areas as { title: string; body: string }[] })}
        />
        <div className="flex justify-end">
          <Button onClick={() => save(v)} loading={saving}>Save About</Button>
        </div>
      </CardBody>
    </Card>
  );
}

function MissionVisionForm({ initial }: { initial: AnyObj }) {
  const { save, saving } = useSaver("mission-vision");
  const [v, setV] = React.useState({
    mission: String(initial.mission ?? ""),
    vision: String(initial.vision ?? ""),
    values: (initial.values as { title: string; body: string }[]) ?? [],
  });
  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <Label>Mission</Label>
          <Textarea value={v.mission} onChange={(e) => setV({ ...v, mission: e.target.value })} />
        </div>
        <div>
          <Label>Vision</Label>
          <Textarea value={v.vision} onChange={(e) => setV({ ...v, vision: e.target.value })} />
        </div>
        <ObjectListEditor
          label="Core values"
          fields={[{ name: "title", label: "Value" }, { name: "body", label: "Description", multiline: true }]}
          values={v.values}
          onChange={(values) => setV({ ...v, values: values as { title: string; body: string }[] })}
        />
        <div className="flex justify-end">
          <Button onClick={() => save(v)} loading={saving}>Save Mission & Vision</Button>
        </div>
      </CardBody>
    </Card>
  );
}

function ContactInfoForm({ initial }: { initial: AnyObj }) {
  const { save, saving } = useSaver("contact-info");
  const [v, setV] = React.useState({
    email: String(initial.email ?? ""),
    phone: String(initial.phone ?? ""),
    whatsapp: String(initial.whatsapp ?? ""),
    address: String(initial.address ?? ""),
    hours: String(initial.hours ?? ""),
    mapEmbedUrl: String(initial.mapEmbedUrl ?? ""),
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV({ ...v, [k]: e.target.value });
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Email</Label><Input value={v.email} onChange={set("email")} /></div>
          <div><Label>Phone</Label><Input value={v.phone} onChange={set("phone")} /></div>
          <div><Label>WhatsApp number</Label><Input value={v.whatsapp} onChange={set("whatsapp")} placeholder="e.g. 919876543210" /></div>
          <div><Label>Working hours</Label><Input value={v.hours} onChange={set("hours")} /></div>
        </div>
        <div><Label>Address</Label><Textarea value={v.address} onChange={set("address")} /></div>
        <div><Label>Google Maps embed URL</Label><Textarea value={v.mapEmbedUrl} onChange={set("mapEmbedUrl")} className="min-h-16" /></div>
        <div className="flex justify-end">
          <Button onClick={() => save(v)} loading={saving}>Save Contact info</Button>
        </div>
      </CardBody>
    </Card>
  );
}
