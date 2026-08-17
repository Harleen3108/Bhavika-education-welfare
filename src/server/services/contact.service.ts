import "server-only";
import { dbConnect } from "@/server/db/connect";
import { ContactSubmission } from "@/server/models";
import { ContactStatus } from "@/lib/enums";
import type { ContactInput } from "@/lib/validation/contact";

export async function createContactSubmission(
  input: ContactInput,
  ipHash: string,
): Promise<void> {
  await dbConnect();
  await ContactSubmission.create({
    name: input.name,
    email: input.email,
    phone: input.phone || undefined,
    subject: input.subject || undefined,
    message: input.message,
    status: ContactStatus.NEW,
    ipHash,
  });
}
