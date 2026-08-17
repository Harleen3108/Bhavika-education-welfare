import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ResourceManager, type FieldDef } from "@/components/admin/ResourceManager";
import { adminListTestimonials } from "@/server/services/admin-read.service";
import { saveTestimonial, deleteTestimonial } from "@/server/actions/content";

export const metadata: Metadata = { title: "Testimonials — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const fields: FieldDef[] = [
  { name: "name", label: "Person's name", type: "text", required: true },
  { name: "role", label: "Role / location", type: "text" },
  { name: "message", label: "Testimonial", type: "textarea", required: true },
  { name: "imageUrl", label: "Photo (optional)", type: "image" },
  { name: "order", label: "Display order", type: "number" },
  { name: "active", label: "Active (visible on site)", type: "checkbox" },
];

export default async function AdminTestimonialsPage() {
  const items = await adminListTestimonials();
  return (
    <>
      <PageHeader title="Testimonials" description="Manage testimonials shown across the site." />
      <ResourceManager
        title="Testimonials"
        singular="Testimonial"
        items={items}
        fields={fields}
        columns={[
          { key: "name", label: "Name" },
          { key: "role", label: "Role" },
          { key: "active", label: "Status" },
        ]}
        onSave={saveTestimonial}
        onDelete={deleteTestimonial}
      />
    </>
  );
}
