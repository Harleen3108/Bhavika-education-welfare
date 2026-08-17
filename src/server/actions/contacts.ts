"use server";

import { revalidatePath } from "next/cache";
import { dbConnect } from "@/server/db/connect";
import { ContactSubmission } from "@/server/models";
import { contactStatusSchema } from "@/lib/validation/admin";
import { logAdminAction } from "@/server/services/audit.service";
import { runAdmin, type ActionResult } from "./util";

export async function setContactStatus(input: unknown): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    const { id, status } = contactStatusSchema.parse(input);
    await dbConnect();
    await ContactSubmission.updateOne({ _id: id }, { $set: { status } });
    await logAdminAction(admin.id, "contact.status", {
      targetType: "ContactSubmission",
      targetId: id,
      reason: status,
    });
    revalidatePath("/admin/contacts");
  });
}
