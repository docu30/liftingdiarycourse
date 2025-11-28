"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createWorkout } from "@/data/workouts";
import { z } from "zod";

const createWorkoutSchema = z.object({
  startedAt: z.string().datetime(),
  notes: z.string().max(1000).optional(),
});

type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export async function createWorkoutAction(input: CreateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = createWorkoutSchema.parse(input);

  const workout = await createWorkout(userId, {
    startedAt: new Date(validated.startedAt),
    notes: validated.notes,
  });

  revalidatePath("/dashboard");

  return { success: true, workout };
}
