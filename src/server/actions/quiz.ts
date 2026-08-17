"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import type { Types } from "mongoose";
import { dbConnect } from "@/server/db/connect";
import { Quiz, type IQuizQuestion } from "@/server/models";
import { quizMetaSchema, questionSchema } from "@/lib/validation/admin";
import { QuizStatus } from "@/lib/enums";
import { slugify } from "@/lib/utils";
import { logAdminAction } from "@/server/services/audit.service";
import { DomainError } from "@/server/http";
import { runAdmin, type ActionResult } from "./util";

function revalidateQuiz(quizId?: string) {
  revalidatePath("/admin/quizzes");
  if (quizId) revalidatePath(`/admin/quizzes/${quizId}`);
  revalidatePath("/dashboard/quizzes");
  revalidatePath("/dashboard");
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "quiz";
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const exists = await Quiz.exists({ slug });
    if (!exists) return slug;
    slug = `${base}-${nanoid(4).toLowerCase()}`;
  }
  return `${base}-${nanoid(6).toLowerCase()}`;
}

export async function saveQuiz(input: unknown, quizId?: string): Promise<ActionResult<{ id: string }>> {
  return runAdmin(async (admin) => {
    const data = quizMetaSchema.parse(input);
    await dbConnect();
    if (quizId) {
      await Quiz.updateOne(
        { _id: quizId },
        {
          $set: {
            title: data.title,
            description: data.description || undefined,
            type: data.type,
            status: data.status,
            startAt: data.startAt,
            endAt: data.endAt,
            timeLimitSeconds: data.timeLimitSeconds,
            maxAttempts: data.maxAttempts,
          },
        },
      );
      await logAdminAction(admin.id, "quiz.update", { targetType: "Quiz", targetId: quizId });
      revalidateQuiz(quizId);
      return { id: quizId };
    }
    const slug = await uniqueSlug(data.title);
    const quiz = await Quiz.create({ ...data, slug, createdBy: admin.id, questions: [] });
    await logAdminAction(admin.id, "quiz.create", { targetType: "Quiz", targetId: quiz._id.toString() });
    revalidateQuiz(quiz._id.toString());
    return { id: quiz._id.toString() };
  });
}

export async function deleteQuiz(quizId: string): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    await dbConnect();
    await Quiz.deleteOne({ _id: quizId });
    await logAdminAction(admin.id, "quiz.delete", { targetType: "Quiz", targetId: quizId });
    revalidateQuiz();
  });
}

export async function setQuizStatus(quizId: string, status: string): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    if (!Object.values(QuizStatus).includes(status as QuizStatus)) {
      throw new DomainError("Invalid status.", 400);
    }
    await dbConnect();
    await Quiz.updateOne({ _id: quizId }, { $set: { status } });
    await logAdminAction(admin.id, "quiz.status", { targetType: "Quiz", targetId: quizId, reason: status });
    revalidateQuiz(quizId);
  });
}

export async function saveQuestion(
  quizId: string,
  input: unknown,
  questionId?: string,
): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    const data = questionSchema.parse(input);
    await dbConnect();
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new DomainError("Quiz not found.", 404);
    const questions = quiz.questions as unknown as Types.DocumentArray<IQuizQuestion>;

    if (questionId) {
      const q = questions.id(questionId);
      if (!q) throw new DomainError("Question not found.", 404);
      q.set({
        text: data.text,
        imageUrl: data.imageUrl || undefined,
        options: data.options,
        correctIndex: data.correctIndex,
        points: data.points,
        order: data.order,
      });
      await logAdminAction(admin.id, "quiz.question.update", { targetType: "Quiz", targetId: quizId });
    } else {
      questions.push({
        text: data.text,
        imageUrl: data.imageUrl || undefined,
        options: data.options,
        correctIndex: data.correctIndex,
        points: data.points,
        order: data.order || questions.length + 1,
      } as unknown as IQuizQuestion);
      await logAdminAction(admin.id, "quiz.question.add", { targetType: "Quiz", targetId: quizId });
    }
    await quiz.save();
    revalidateQuiz(quizId);
  });
}

export async function deleteQuestion(quizId: string, questionId: string): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    await dbConnect();
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new DomainError("Quiz not found.", 404);
    const questions = quiz.questions as unknown as Types.DocumentArray<IQuizQuestion>;
    const q = questions.id(questionId);
    if (q) {
      q.deleteOne();
      await quiz.save();
      await logAdminAction(admin.id, "quiz.question.delete", { targetType: "Quiz", targetId: quizId });
    }
    revalidateQuiz(quizId);
  });
}
