import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

interface ComplexityChartProps {
  data?: Array<{
    date: number;
    complexityScore?: number;
  }>;
  isLoading?: boolean;
}

export const ComplexityChart: React.FC<ComplexityChartProps> = ({ 
  data, 
  isLoading 
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Complexity Trends</CardTitle>
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
          <CardTitle>Complexity Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium">No complexity data available</p>
              <p className="text-sm">Commit data or analysis may be in progress</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complexity Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={safeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-4 border rounded shadow">
                      <p>{new Date(payload[0].payload.date).toLocaleDateString()}</p>
                      <p>Complexity Score: {payload[0].value}</p>
                    </div>
                  );
                }
                return null;
              }} 
            />
            <Line 
              type="monotone" 
              dataKey="complexityScore" 
              stroke="#8884d8" 
              activeDot={{ r: 8 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};