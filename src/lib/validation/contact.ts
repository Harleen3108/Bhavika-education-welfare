import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+\d][\d\s-]{6,}$/, "Enter a valid phone number.")
    .optional()
    .or(z.literal("")),
  subject: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(2000),
  // Honeypot — must stay empty (bots fill it).
  website: z.string().max(0).optional().or(z.literal("")),
});

export type ContactInput = z.infer<typeof contactSchema>;
