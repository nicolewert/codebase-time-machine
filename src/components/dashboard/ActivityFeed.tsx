import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { formatDistance } from 'date-fns';

interface ActivityFeedProps {
  commits?: Array<{
    _id: string;
    sha: string;
    author: string;
    message: string;
    aiSummary?: string;
    date: number;
    filesChanged: string[];
  }>;
  isLoading?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  commits, 
  isLoading 
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Commits</CardTitle>
        </CardHeader>
        <CardContent>
          {[1, 2, 3].map((_, index) => (
            <Skeleton key={index} className="h-[80px] w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Handle empty or invalid data
  const safeCommits = Array.isArray(commits) ? commits : [];
  const hasCommits = safeCommits.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Commits</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasCommits ? (
          <div className="py-8 text-center text-gray-500">
            <p className="text-lg font-medium">No recent commits available</p>
            <p className="text-sm">Repository may not have commit data yet</p>
          </div>
        ) : (
          safeCommits.map((commit) => {
            // Safe data access with fallbacks
            const safeAuthor = commit.author || 'Unknown Author';
            const safeDate = commit.date && !isNaN(commit.date) ? commit.date : Date.now();
            const safeMessage = commit.message || 'No commit message';
            const safeFilesChanged = Array.isArray(commit.filesChanged) ? commit.filesChanged : [];
            const authorInitials = safeAuthor
              .split(' ')
              .map(n => n[0] || '')
              .join('')
              .toUpperCase()
              .substring(0, 2);

            return (
              <div 
                key={commit._id || commit.sha || Math.random().toString()} 
                className="flex items-start space-x-4 py-4 border-b last:border-b-0"
              >
                <Avatar>
                  <AvatarFallback>
                    {authorInitials || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold">{safeAuthor}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDistance(new Date(safeDate), new Date(), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {safeFilesChanged.length} file{safeFilesChanged.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <p className="mt-2 text-sm">{safeMessage}</p>
                  
                  {commit.aiSummary && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-sm italic">
                      AI Summary: {commit.aiSummary}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};