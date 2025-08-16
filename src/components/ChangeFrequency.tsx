import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { formatDistance } from 'date-fns';
import { cn } from '@/lib/utils';

// Detailed TypeScript interface for component props
interface ChangeFrequencyProps {
  repositoryId: Id<'repositories'>;
  fileId?: Id<'files'>;
  timeWindow?: '7d' | '30d' | '90d' | '1y';
  showCalendar?: boolean;
}

// Interface for change frequency data
interface ChangeFrequencyData {
  date: string;
  changes: number;
  files: string[];
  intensity: number;
}

const TIME_WINDOWS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

export function ChangeFrequency({
  repositoryId, 
  fileId, 
  timeWindow = '30d', 
  showCalendar = true 
}: ChangeFrequencyProps) {
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<keyof typeof TIME_WINDOWS>(timeWindow);

  // Fetch change frequency stats from Convex
  const changeFrequencyStats = useQuery(api.analysis.getChangeFrequencyStats, { 
    repositoryId, 
    fileId, 
    days: TIME_WINDOWS[selectedTimeWindow] 
  });

  // Derived data for visualization
  const calendarData = useMemo(() => {
    if (!changeFrequencyStats) return [];
    
    return changeFrequencyStats.map(stat => ({
      ...stat,
      intensity: Math.min(Math.max(stat.changes, 0), 4) // Normalize intensity
    }));
  }, [changeFrequencyStats]);

  // Loading state
  if (!changeFrequencyStats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(35)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render calendar heatmap
  const renderCalendarHeatmap = () => {
    return (
      <div className="grid grid-cols-7 gap-1">
        {calendarData.map((day, index) => (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "h-8 w-full rounded transition-all",
                    `bg-blue-${100 + day.intensity * 200}`, // Intensity-based color
                    "hover:scale-105 cursor-pointer"
                  )}
                />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p>Changes: {day.changes}</p>
                  <p>Files Modified: {day.files.length}</p>
                  <p>Date: {new Date(day.date).toLocaleDateString()}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    );
  };

  // Compute additional insights
  const insights = {
    totalChanges: calendarData.reduce((sum, day) => sum + day.changes, 0),
    averageChangesPerDay: calendarData.reduce((sum, day) => sum + day.changes, 0) / calendarData.length,
    mostActiveDay: calendarData.reduce((max, day) => day.changes > max.changes ? day : max, calendarData[0])
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Change Frequency Analysis 
          {fileId ? ` (Single File)` : ` (Repository-wide)`}
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Select 
            value={selectedTimeWindow} 
            onValueChange={(val: keyof typeof TIME_WINDOWS) => setSelectedTimeWindow(val)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Time Window" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {showCalendar && (
          <>
            {renderCalendarHeatmap()}
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div>
                <strong>Total Changes:</strong> {insights.totalChanges}
              </div>
              <div>
                <strong>Avg. Daily Changes:</strong> {insights.averageChangesPerDay.toFixed(2)}
              </div>
              <div>
                <strong>Most Active Day:</strong> {new Date(insights.mostActiveDay.date).toLocaleDateString()}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}