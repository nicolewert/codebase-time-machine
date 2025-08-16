import React, { useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { Button } from '../ui/button';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { DashboardFilters } from './Dashboard';

interface TimeRangeSelectorProps {
  onTimeRangeChange: (range: DashboardFilters) => void;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ 
  onTimeRangeChange 
}) => {
  const [selectedRange, setSelectedRange] = useState<string>('30d');

  const handleRangeChange = (value: string) => {
    setSelectedRange(value);
    
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    const today = new Date();

    switch (value) {
      case '7d':
        startDate = startOfDay(subDays(today, 7));
        endDate = endOfDay(today);
        break;
      case '30d':
        startDate = startOfDay(subDays(today, 30));
        endDate = endOfDay(today);
        break;
      case '90d':
        startDate = startOfDay(subDays(today, 90));
        endDate = endOfDay(today);
        break;
      case 'all':
        startDate = null;
        endDate = null;
        break;
    }

    onTimeRangeChange({ startDate, endDate });
  };

  const handleClear = () => {
    setSelectedRange('all');
    onTimeRangeChange({ startDate: null, endDate: null });
  };

  return (
    <div className="flex items-center space-x-2">
      <Select value={selectedRange} onValueChange={handleRangeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Last 7 Days</SelectItem>
          <SelectItem value="30d">Last 30 Days</SelectItem>
          <SelectItem value="90d">Last 90 Days</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleClear}
        disabled={selectedRange === 'all'}
      >
        Clear
      </Button>
    </div>
  );
};