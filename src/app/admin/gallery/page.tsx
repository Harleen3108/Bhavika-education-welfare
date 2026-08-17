import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ResourceManager, type FieldDef } from "@/components/admin/ResourceManager";
import { adminListGallery } from "@/server/services/admin-read.service";
import { saveGalleryItem, deleteGalleryItem } from "@/server/actions/content";

export const metadata: Metadata = { title: "Gallery — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const fields: FieldDef[] = [
  { name: "title", label: "Title", type: "text", required: true },
  { name: "imageUrl", label: "Image", type: "image", required: true },
  { name: "category", label: "Category", type: "text", placeholder: "e.g. Education" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "order", label: "Display order", type: "number" },
  { name: "active", label: "Active (visible on site)", type: "checkbox" },
];

export default async function AdminGalleryPage() {
  const items = await adminListGallery();
  return (
    <>
      <PageHeader title="Gallery" description="Manage photos shown on the public gallery." />
      <ResourceManager
        title="Photos"
        singular="Photo"
        items={items}
        fields={fields}
        columns={[
          { key: "title", label: "Title" },
          { key: "category", label: "Category" },
          { key: "active", label: "Status" },
        ]}
        onSave={saveGalleryItem}
        onDelete={deleteGalleryItem}
      />
    </>
  );
}
