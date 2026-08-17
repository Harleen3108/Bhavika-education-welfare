import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ResourceManager, type FieldDef } from "@/components/admin/ResourceManager";
import { adminListVideos } from "@/server/services/admin-read.service";
import { saveVideo, deleteVideo } from "@/server/actions/content";

export const metadata: Metadata = { title: "Videos — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const fields: FieldDef[] = [
  { name: "title", label: "Title", type: "text", required: true },
  { name: "videoUrl", label: "Video URL (YouTube/Vimeo)", type: "url", required: true },
  { name: "thumbnailUrl", label: "Thumbnail URL (optional)", type: "url" },
  { name: "category", label: "Category", type: "text" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "order", label: "Display order", type: "number" },
  { name: "active", label: "Active (visible on site)", type: "checkbox" },
];

export default async function AdminVideosPage() {
  const items = await adminListVideos();
  return (
    <>
      <PageHeader title="Videos" description="Manage videos shown on the public videos page." />
      <ResourceManager
        title="Videos"
        singular="Video"
        items={items}
        fields={fields}
        columns={[
          { key: "title", label: "Title" },
          { key: "category", label: "Category" },
          { key: "active", label: "Status" },
        ]}
        onSave={saveVideo}
        onDelete={deleteVideo}
      />
    </>
  );
}
