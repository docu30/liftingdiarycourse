"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { updateWorkout } from "@/data/workouts";
import { z } from "zod";

const updateWorkoutSchema = z.object({
  id: z.number().int().positive(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;

export async function updateWorkoutAction(input: UpdateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = updateWorkoutSchema.parse(input);
  const { id, ...data } = validated;

  // Convert string dates to Date objects and filter out null values
  const updateData: {
    startedAt?: Date;
    completedAt?: Date;
    duration?: number;
    notes?: string;
  } = {};

  if (data.startedAt) {
    updateData.startedAt = new Date(data.startedAt);
  }
  if (data.completedAt) {
    updateData.completedAt = new Date(data.completedAt);
  }
  if (data.duration !== null && data.duration !== undefined) {
    updateData.duration = data.duration;
  }
  if (data.notes !== null && data.notes !== undefined) {
    updateData.notes = data.notes;
  }

  const workout = await updateWorkout(id, userId, updateData);

  if (!workout) {
    throw new Error("Workout not found or you don't have permission to update it");
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/workout/${id}`);

  return { success: true, workout };
}
