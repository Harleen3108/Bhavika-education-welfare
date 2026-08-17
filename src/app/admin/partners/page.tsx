import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ResourceManager, type FieldDef } from "@/components/admin/ResourceManager";
import { adminListPartners } from "@/server/services/admin-read.service";
import { savePartner, deletePartner } from "@/server/actions/content";

export const metadata: Metadata = { title: "Partners — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const fields: FieldDef[] = [
  { name: "name", label: "Partner name", type: "text", required: true },
  { name: "logoUrl", label: "Logo", type: "image" },
  { name: "websiteUrl", label: "Website URL", type: "url" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "order", label: "Display order", type: "number" },
  { name: "active", label: "Active (visible on site)", type: "checkbox" },
];

export default async function AdminPartnersPage() {
  const items = await adminListPartners();
  return (
    <>
      <PageHeader title="Partners" description="Manage partner organisations shown on the site." />
      <ResourceManager
        title="Partners"
        singular="Partner"
        items={items}
        fields={fields}
        columns={[
          { key: "name", label: "Name" },
          { key: "websiteUrl", label: "Website" },
          { key: "active", label: "Status" },
        ]}
        onSave={savePartner}
        onDelete={deletePartner}
      />
    </>
  );
}
