import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id.");

export const submitQuizSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: objectId,
        selectedIndex: z.number().int().min(0).max(5).nullable(),
      }),
    )
    .max(100),
});

export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;
