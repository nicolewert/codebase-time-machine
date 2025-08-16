import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  ArrowUpIcon, 
  ArrowDownIcon 
} from '@radix-ui/react-icons';
import { Skeleton } from '../ui/skeleton';

interface StatsCardsProps {
  stats?: {
    totalCommits: number;
    uniqueAuthors: number;
    filesChanged: number;
    averageComplexity: number;
    mostComplexFile: string;
  };
  isLoading?: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ 
  stats, 
  isLoading 
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((_, index) => (
          <Skeleton key={index} className="h-[120px] w-full" />
        ))}
      </div>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    trend 
  }: { 
    title: string; 
    value: number; 
    trend: number 
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs flex items-center ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend > 0 ? <ArrowUpIcon className="mr-1" /> : <ArrowDownIcon className="mr-1" />}
          {Math.abs(trend)}% from last period
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard 
        title="Total Commits" 
        value={stats?.totalCommits || 0} 
        trend={0} 
      />
      <StatCard 
        title="Unique Authors" 
        value={stats?.uniqueAuthors || 0} 
        trend={0} 
      />
      <StatCard 
        title="Files Changed" 
        value={stats?.filesChanged || 0} 
        trend={0} 
      />
    </div>
  );
};