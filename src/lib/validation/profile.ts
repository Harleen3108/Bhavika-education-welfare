import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+\d][\d\s-]{6,}$/, "Enter a valid phone number.")
    .optional()
    .or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().trim().max(400).optional().or(z.literal("")),
  avatarUrl: z.string().url("Invalid image URL.").optional().or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;
