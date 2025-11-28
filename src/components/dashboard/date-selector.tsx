"use client";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface DateSelectorProps {
  selectedDate: Date;
}

export function DateSelector({ selectedDate }: DateSelectorProps) {
  const router = useRouter();

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    // Format date as YYYY-MM-DD for URL
    const formattedDate = format(date, "yyyy-MM-dd");
    router.push(`/dashboard?date=${formattedDate}`);
    // Force server-side re-fetch of data
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Date</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          className="rounded-md border"
        />
      </CardContent>
    </Card>
  );
}
