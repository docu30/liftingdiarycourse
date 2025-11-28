import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";

/**
 * Get all workouts for a user on a specific date with exercises and sets
 * @param userId - The user's ID from Clerk
 * @param date - The date to filter workouts by
 * @returns Array of workouts with nested exercises and sets
 */
export async function getWorkoutsForDate(userId: string, date: Date) {
  // Disable caching to ensure fresh data on each request
  noStore();
  // Create date range for the selected day (start of day to end of day)
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch workouts with all related data using Drizzle relations
  const userWorkouts = await db.query.workouts.findMany({
    where: and(
      eq(workouts.userId, userId),
      gte(workouts.startedAt, startOfDay),
      lt(workouts.startedAt, endOfDay)
    ),
    with: {
      workoutExercises: {
        orderBy: (workoutExercises, { asc }) => [asc(workoutExercises.order)],
        with: {
          exercise: true,
          sets: {
            orderBy: (sets, { asc }) => [asc(sets.setNumber)],
          },
        },
      },
    },
    orderBy: [desc(workouts.startedAt)],
  });

  return userWorkouts;
}

/**
 * Get a single workout by ID (with ownership check)
 * @param workoutId - The workout ID
 * @param userId - The user's ID from Clerk
 * @returns The workout with exercises and sets, or undefined if not found
 */
export async function getWorkout(workoutId: number, userId: string) {
  const workout = await db.query.workouts.findFirst({
    where: and(
      eq(workouts.id, workoutId),
      eq(workouts.userId, userId)
    ),
    with: {
      workoutExercises: {
        orderBy: (workoutExercises, { asc }) => [asc(workoutExercises.order)],
        with: {
          exercise: true,
          sets: {
            orderBy: (sets, { asc }) => [asc(sets.setNumber)],
          },
        },
      },
    },
  });

  return workout;
}

/**
 * Get all workouts for a user (for listing/history views)
 * @param userId - The user's ID from Clerk
 * @param limit - Optional limit for pagination
 * @returns Array of workouts ordered by most recent first
 */
export async function getWorkouts(userId: string, limit?: number) {
  const userWorkouts = await db.query.workouts.findMany({
    where: eq(workouts.userId, userId),
    with: {
      workoutExercises: {
        orderBy: (workoutExercises, { asc }) => [asc(workoutExercises.order)],
        with: {
          exercise: true,
          sets: {
            orderBy: (sets, { asc }) => [asc(sets.setNumber)],
          },
        },
      },
    },
    orderBy: [desc(workouts.startedAt)],
    limit,
  });

  return userWorkouts;
}
