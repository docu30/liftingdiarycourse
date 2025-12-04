"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

// Type for the workout data with nested relations
type WorkoutWithDetails = {
  id: number;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  notes: string | null;
  workoutExercises: {
    id: number;
    order: number;
    notes: string | null;
    exercise: {
      id: number;
      name: string;
    };
    sets: {
      id: number;
      setNumber: number;
      reps: number;
      weight: number;
      isWarmup: boolean;
    }[];
  }[];
};

interface WorkoutListProps {
  workouts: WorkoutWithDetails[];
  selectedDate: Date;
}

export function WorkoutList({ workouts, selectedDate }: WorkoutListProps) {
  return (
    <div className="lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">
          Workouts for {format(selectedDate, "do MMM yyyy")}
        </h2>
        <span className="text-sm text-muted-foreground">
          {workouts.length} workout{workouts.length !== 1 ? "s" : ""} logged
        </span>
      </div>

      <div className="space-y-4">
        {workouts.length > 0 ? (
          workouts.map((workout) => {
            // Calculate total sets and exercises
            const totalExercises = workout.workoutExercises.length;
            const totalSets = workout.workoutExercises.reduce(
              (acc, we) => acc + we.sets.length,
              0
            );

            // Format workout time
            const workoutTime = format(workout.startedAt, "h:mm a");

            // Format duration
            const durationMinutes = workout.duration
              ? Math.round(workout.duration / 60)
              : null;

            return (
              <Link
                key={workout.id}
                href={`/dashboard/workout/${workout.id}`}
                className="block"
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {workout.completedAt ? "Workout" : "Workout (In Progress)"}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {workoutTime}
                          {durationMinutes && ` • ${durationMinutes} minutes`}
                          {` • ${totalExercises} exercise${totalExercises !== 1 ? "s" : ""}`}
                          {` • ${totalSets} set${totalSets !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>
                    {workout.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {workout.notes}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {workout.workoutExercises.map((workoutExercise) => {
                        // Filter out warmup sets for the summary
                        const workingSets = workoutExercise.sets.filter(
                          (set) => !set.isWarmup
                        );

                        return (
                          <div
                            key={workoutExercise.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                          >
                            <div className="flex-1">
                              <p className="font-medium">
                                {workoutExercise.exercise.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {workoutExercise.sets.length} set
                                {workoutExercise.sets.length !== 1 ? "s" : ""}
                                {workingSets.length > 0 && (
                                  <>
                                    {" × "}
                                    {workingSets.map((set) => set.reps).join(", ")}
                                    {" reps"}
                                    {workingSets[0]?.weight && (
                                      <> @ {workingSets[0].weight} lbs</>
                                    )}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No workouts logged for {format(selectedDate, "do MMM yyyy")}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Start tracking your workouts to see them here!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
