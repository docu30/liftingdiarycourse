import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getWorkout } from "@/data/workouts";
import { EditWorkoutForm } from "./edit-workout-form";

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  // Get authenticated user (middleware ensures userId exists)
  const { userId } = await auth();
  if (!userId) {
    // This should never happen due to middleware protection
    throw new Error("Unauthorized");
  }

  const { workoutId } = await params;
  const workoutIdNum = parseInt(workoutId, 10);

  if (isNaN(workoutIdNum)) {
    notFound();
  }

  const workout = await getWorkout(workoutIdNum, userId);

  if (!workout) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Edit Workout</h1>
        <p className="text-muted-foreground">
          Update your workout details
        </p>
      </div>

      <EditWorkoutForm workout={workout} />
    </div>
  );
}
