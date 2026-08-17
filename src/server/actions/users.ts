"use server";

import { revalidatePath } from "next/cache";
import { dbConnect } from "@/server/db/connect";
import { User } from "@/server/models";
import { userStatusSchema } from "@/lib/validation/admin";
import { logAdminAction } from "@/server/services/audit.service";
import { runAdmin, type ActionResult } from "./util";

export async function setUserStatus(input: unknown): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    const { userId, status, reason } = userStatusSchema.parse(input);
    await dbConnect();
    await User.updateOne({ _id: userId }, { $set: { status } });
    await logAdminAction(admin.id, "user.status", {
      targetType: "User",
      targetId: userId,
      reason: `${status}${reason ? ` — ${reason}` : ""}`,
    });
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
  });
}
