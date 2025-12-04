import { auth } from "@clerk/nextjs/server";
import { WorkoutForm } from "./workout-form";

export default async function NewWorkoutPage() {
  // Get authenticated user (middleware ensures userId exists)
  const { userId } = await auth();
  if (!userId) {
    // This should never happen due to middleware protection
    throw new Error("Unauthorized");
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Workout</h1>
        <p className="text-muted-foreground">
          Start a new workout session
        </p>
      </div>

      <WorkoutForm />
    </div>
  );
}
