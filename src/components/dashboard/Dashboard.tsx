import React, { useState, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { TimeRangeSelector } from './TimeRangeSelector';
import { StatsCards } from './StatsCards';
import { ComplexityChart } from './ComplexityChart';
import { OwnershipMap } from './OwnershipMap';
import { ActivityFeed } from './ActivityFeed';
import { Card } from '../ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

export interface DashboardFilters {
  startDate: Date | null;
  endDate: Date | null;
}

interface DashboardProps {
  repositoryId: Id<"repositories">;
}

export const Dashboard: React.FC<DashboardProps> = ({ repositoryId }) => {
  // React hooks must be called first, before any conditional returns
  const [filters, setFilters] = useState<DashboardFilters>({
    startDate: null,
    endDate: null
  });

  const handleTimeRangeChange = useCallback((range: DashboardFilters) => {
    setFilters(range);
  }, []);

  // Fetch dashboard data with error handling
  const dashboardData = useQuery(api.dashboard.getDashboardData, { 
    repositoryId,
    dateFrom: filters.startDate?.getTime(),
    dateTo: filters.endDate?.getTime()
  });

  const complexityTrends = useQuery(api.dashboard.getComplexityTrends, {
    repositoryId,
    dateFrom: filters.startDate?.getTime(),
    dateTo: filters.endDate?.getTime()
  });

  const ownershipData = useQuery(api.dashboard.getOwnershipData, {
    repositoryId,
    dateFrom: filters.startDate?.getTime(),
    dateTo: filters.endDate?.getTime()
  });

  const recentActivity = useQuery(api.dashboard.getRecentActivity, {
    repositoryId
  });

  // Check for loading states
  const isLoading = dashboardData === undefined || 
                   complexityTrends === undefined || 
                   ownershipData === undefined || 
                   recentActivity === undefined;

  // Check for error states (Convex returns null on error)
  const hasError = dashboardData === null || 
                  complexityTrends === null || 
                  ownershipData === null || 
                  recentActivity === null;

  const handleRefresh = useCallback(() => {
    // Force re-render to trigger query refresh
    setFilters(prev => ({ ...prev }));
  }, []);

  // Validate repositoryId after hooks
  if (!repositoryId) {
    return (
      <div className="container mx-auto p-4">
        <Card className="p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Invalid Repository</h3>
          <p className="text-gray-600">
            No repository ID provided. Please select a valid repository.
          </p>
        </Card>
      </div>
    );
  }

  // Error state component
  const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
    <Card className="p-8 text-center">
      <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Unable to Load Dashboard</h3>
      <p className="text-gray-600 mb-4">
        There was an error loading the dashboard data. This could be due to network issues or server problems.
      </p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </Card>
  );

  // Loading state component
  const LoadingState = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        <div className="h-10 bg-gray-200 rounded w-48 animate-pulse"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-6">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <Card key={i} className="p-6 h-80">
            <div className="h-full bg-gray-200 rounded animate-pulse"></div>
          </Card>
        ))}
      </div>
    </div>
  );

  // Handle error state
  if (hasError) {
    return (
      <div className="container mx-auto p-4">
        <ErrorState onRetry={handleRefresh} />
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Repository Dashboard</h1>
        <TimeRangeSelector 
          onTimeRangeChange={handleTimeRangeChange} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCards 
          stats={dashboardData?.repositoryHealth || {
            totalCommits: 0,
            uniqueAuthors: 0,
            filesChanged: 0,
            averageComplexity: 0,
            mostComplexFile: "N/A"
          }} 
          isLoading={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplexityChart 
          data={complexityTrends?.complexityTrends || []} 
          isLoading={false}
        />
        <OwnershipMap 
          data={ownershipData || []} 
          isLoading={false}
        />
      </div>

      <ActivityFeed 
        commits={recentActivity?.recentCommits || []} 
        isLoading={false}
      />
    </div>
  );
};