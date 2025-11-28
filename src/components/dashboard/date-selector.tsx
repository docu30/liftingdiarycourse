"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface DateSelectorProps {
  selectedDate: Date;
}

export function DateSelector({ selectedDate }: DateSelectorProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Only render calendar after component mounts on client
  useEffect(() => {
    setMounted(true);
  }, []);

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
        {mounted ? (
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border"
          />
        ) : (
          <div className="h-[350px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading calendar...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
