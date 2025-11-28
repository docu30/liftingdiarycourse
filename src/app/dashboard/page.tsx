"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Initialize date on client side only to avoid hydration mismatch
  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  // Mock workout data for UI display
  const mockWorkouts = [
    {
      id: 1,
      name: "Morning Strength Training",
      exercises: [
        { name: "Bench Press", sets: 4, reps: 8, weight: 185 },
        { name: "Incline Dumbbell Press", sets: 3, reps: 10, weight: 70 },
        { name: "Cable Flyes", sets: 3, reps: 12, weight: 40 },
      ],
      duration: 60,
      time: "8:30 AM",
    },
    {
      id: 2,
      name: "Evening Core Work",
      exercises: [
        { name: "Plank", sets: 3, reps: null, weight: null },
        { name: "Russian Twists", sets: 3, reps: 20, weight: 25 },
        { name: "Leg Raises", sets: 3, reps: 15, weight: null },
      ],
      duration: 30,
      time: "6:00 PM",
    },
  ];

  // Show loading state while date is initializing
  if (!selectedDate) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Workout Dashboard</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Workout Dashboard</h1>
        <p className="text-muted-foreground">
          Track and view your workouts for {format(selectedDate, "do MMM yyyy")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Date Picker Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </div>

        {/* Workouts List Section */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              Workouts for {format(selectedDate, "do MMM yyyy")}
            </h2>
            <span className="text-sm text-muted-foreground">
              {mockWorkouts.length} workout{mockWorkouts.length !== 1 ? "s" : ""}{" "}
              logged
            </span>
          </div>

          <div className="space-y-4">
            {mockWorkouts.length > 0 ? (
              mockWorkouts.map((workout) => (
                <Card key={workout.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{workout.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {workout.time} • {workout.duration} minutes
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {workout.exercises.map((exercise, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{exercise.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {exercise.sets} sets
                              {exercise.reps && ` × ${exercise.reps} reps`}
                              {exercise.weight && ` @ ${exercise.weight} lbs`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
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
      </div>
    </div>
  );
}
