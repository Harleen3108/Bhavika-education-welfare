"use server";

import { revalidatePath } from "next/cache";
import { dbConnect } from "@/server/db/connect";
import { SystemSettings } from "@/server/models";
import { settingsSchema } from "@/lib/validation/admin";
import { logAdminAction } from "@/server/services/audit.service";
import { runAdmin, type ActionResult } from "./util";

export async function updateSettings(input: unknown): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    const data = settingsSchema.parse(input);
    await dbConnect();
    await SystemSettings.updateOne(
      { singleton: "global" },
      { $set: { ...data, singleton: "global", updatedBy: admin.id } },
      { upsert: true },
    );
    await logAdminAction(admin.id, "settings.update", { targetType: "SystemSettings" });
    // Settings affect public + dashboard behavior broadly.
    revalidatePath("/", "layout");
  });
}
