import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getWorkoutsForDate } from "@/data/workouts";
import { DateSelector } from "@/components/dashboard/date-selector";
import { WorkoutList } from "@/components/dashboard/workout-list";

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  // Get authenticated user
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Get date from search params or default to today
  const params = await searchParams;
  const dateParam = params.date;
  const selectedDate = dateParam ? new Date(dateParam) : new Date();

  // Fetch workouts for the selected date
  const workouts = await getWorkoutsForDate(userId, selectedDate);

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
          <DateSelector selectedDate={selectedDate} />
        </div>

        {/* Workouts List Section */}
        <WorkoutList workouts={workouts} selectedDate={selectedDate} />
      </div>
    </div>
  );
}
