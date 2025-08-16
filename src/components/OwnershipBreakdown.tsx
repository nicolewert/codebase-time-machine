import React, { useState, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Pie Chart (Optional: consider adding recharts library for more advanced charting)
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';

// Types for Ownership Data
interface ContributorMetrics {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  commitCount: number;
  totalCommits: number;
  linesAdded: number;
  linesDeleted: number;
  complexity: number;
  firstCommitDate: Date;
  lastCommitDate: Date;
}

// Props Interface
interface OwnershipBreakdownProps {
  repositoryId?: Id<"repositories">;
  fileId?: Id<"files">;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

// Corporate color palette matching theme
const CORPORATE_COLORS = [
  'hsl(217, 91%, 60%)',   // Executive Blue
  'hsl(197, 71%, 52%)',   // Sky Blue
  'hsl(215, 28%, 17%)',   // Charcoal Gray
  'hsl(142, 69%, 58%)',   // Professional Green
  'hsl(215, 16%, 65%)',   // Sophisticated Gray
];

export function OwnershipBreakdown({ 
  repositoryId, 
  fileId, 
  timeRange 
}: OwnershipBreakdownProps) {
  const [sortMetric, setSortMetric] = useState<keyof ContributorMetrics>('commitCount');
  const [minContributionThreshold, setMinContributionThreshold] = useState(1);

  // Fetch ownership data from Convex
  const ownershipData = useQuery(api.analysis.getFileOwnership, { 
    repositoryId, 
    fileId, 
    timeRange 
  });

  // Memoized and sorted contributors
  const sortedContributors = useMemo(() => {
    if (!ownershipData) return [];
    
    return ownershipData.contributors
      .filter(c => c.commitCount >= minContributionThreshold)
      .sort((a, b) => b[sortMetric] - a[sortMetric]);
  }, [ownershipData, sortMetric, minContributionThreshold]);

  // Pie chart data preparation
  const pieChartData = useMemo(() => 
    sortedContributors.map(c => ({
      name: c.name,
      value: c.commitCount
    })), 
    [sortedContributors]
  );

  if (!ownershipData) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-grow">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>
          Ownership Breakdown
          {fileId && (
            <Badge variant="secondary" className="ml-2">File Analysis</Badge>
          )}
          {repositoryId && (
            <Badge variant="secondary" className="ml-2">Repository Analysis</Badge>
          )}
        </CardTitle>
        
        <div className="flex space-x-2 items-center">
          <Select 
            value={sortMetric} 
            onValueChange={(val) => setSortMetric(val as keyof ContributorMetrics)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="commitCount">Commits</SelectItem>
              <SelectItem value="linesAdded">Lines Added</SelectItem>
              <SelectItem value="complexity">Complexity</SelectItem>
            </SelectContent>
          </Select>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setMinContributionThreshold(prev => Math.max(1, prev - 1))}
                >
                  -
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Decrease Minimum Contribution Threshold
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <span>{minContributionThreshold}</span>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setMinContributionThreshold(prev => prev + 1)}
                >
                  +
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Increase Minimum Contribution Threshold
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ownership Distribution Chart */}
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {pieChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CORPORATE_COLORS[index % CORPORATE_COLORS.length]} 
                  />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Contributors List */}
        <div className="space-y-4">
          {sortedContributors.map((contributor, index) => (
            <div 
              key={contributor.id} 
              className="flex items-center space-x-4 p-3 rounded-lg hover:bg-secondary/20 transition-colors"
            >
              <Avatar>
                <AvatarImage src={contributor.avatarUrl} alt={contributor.name} />
                <AvatarFallback>
                  {contributor.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-grow">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">{contributor.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {((contributor.commitCount / ownershipData.totalCommits) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={(contributor.commitCount / ownershipData.totalCommits) * 100} 
                  className={cn(
                    "h-2", 
                    index % 2 === 0 ? "bg-primary/20" : "bg-secondary/20"
                  )}
                />
                <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                  <span>Commits: {contributor.commitCount}</span>
                  <span>Lines: +{contributor.linesAdded} -{ contributor.linesDeleted}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default OwnershipBreakdown;