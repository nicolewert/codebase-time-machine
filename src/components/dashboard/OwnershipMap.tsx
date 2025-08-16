import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';

interface OwnershipMapProps {
  data?: Array<{
    author: string;
    commitCount: number;
    linesAdded: number;
    linesDeleted: number;
    fileCount: number;
    topFiles: string[];
  }>;
  isLoading?: boolean;
}

export const OwnershipMap: React.FC<OwnershipMapProps> = ({ 
  data, 
  isLoading 
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contributor Ownership</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Handle empty or invalid data
  const safeData = Array.isArray(data) ? data : [];
  const hasData = safeData.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contributor Ownership</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium">No contributor data available</p>
              <p className="text-sm">Repository may not have commit data yet</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contributor Ownership</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={safeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="author" 
              tickFormatter={(value) => value.split(' ')[0]} 
            />
            <YAxis />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const author = payload[0].payload;
                  return (
                    <div className="bg-white p-4 border rounded shadow flex items-center">
                      <Avatar className="mr-2">
                        <AvatarImage 
                          src={author.avatarUrl} 
                          alt={author.author} 
                        />
                        <AvatarFallback>
                          {author.author.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p>{author.author}</p>
                        <p>Commits: {author.commitCount}</p>
                        <p>Files Modified: {author.fileCount}</p>
                        <p>Lines Added: {author.linesAdded}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              }} 
            />
            <Bar 
              dataKey="commitCount" 
              fill="#82ca9d" 
              name="Commits" 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};