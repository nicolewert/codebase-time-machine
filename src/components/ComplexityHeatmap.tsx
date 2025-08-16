import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";

// Complexity color mapping
const COMPLEXITY_COLORS = {
  low: 'bg-green-500/20 hover:bg-green-500/40 border-green-500',
  medium: 'bg-yellow-500/20 hover:bg-yellow-500/40 border-yellow-500',
  high: 'bg-orange-500/20 hover:bg-orange-500/40 border-orange-500',
  critical: 'bg-red-500/20 hover:bg-red-500/40 border-red-500'
};

// Type definitions
interface FileComplexityData {
  path: string;
  complexity: number;
  size: number;
  changeFrequency: number;
  hotspotScore: number;
}

interface HeatmapTileProps extends FileComplexityData {
  onSelect: (path: string) => void;
  isSelected: boolean;
}

// Complexity categorization function
const categorizeComplexity = (complexity: number): keyof typeof COMPLEXITY_COLORS => {
  if (complexity <= 3) return 'low';
  if (complexity <= 7) return 'medium';
  if (complexity <= 12) return 'high';
  return 'critical';
};

// Heatmap Tile Component
const HeatmapTile: React.FC<HeatmapTileProps> = ({
  path, 
  complexity, 
  size, 
  changeFrequency, 
  hotspotScore, 
  onSelect,
  isSelected
}) => {
  const complexityCategory = categorizeComplexity(complexity);
  
  // Calculate tile size based on file size (log scale to prevent extreme variations)
  const tileSize = Math.max(32, Math.min(128, Math.log(size + 1) * 20));
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div 
            className={cn(
              `relative border-2 m-1 cursor-pointer transition-all duration-200 ease-in-out`,
              COMPLEXITY_COLORS[complexityCategory],
              isSelected ? 'ring-2 ring-blue-500' : '',
              'hover:scale-105'
            )}
            style={{ 
              width: `${tileSize}px`, 
              height: `${tileSize}px` 
            }}
            onClick={() => onSelect(path)}
          >
            {/* Hotspot indicator */}
            {hotspotScore > 0.7 && (
              <div 
                className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse"
                title="High Hotspot Score"
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-background border shadow-lg">
          <div className="space-y-1">
            <p className="font-bold">{path}</p>
            <p>Complexity: {complexity}</p>
            <p>Size: {size} lines</p>
            <p>Change Frequency: {changeFrequency}</p>
            <p>Hotspot Score: {hotspotScore.toFixed(2)}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Main ComplexityHeatmap Component
export const ComplexityHeatmap: React.FC = () => {
  // State management
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'treemap'>('grid');
  const [groupByDirectory, setGroupByDirectory] = useState(false);

  // Fetch file complexity data from Convex
  const fileComplexityData = useQuery(api.files.getFileTree);

  // Memoized data processing
  const processedData = useMemo(() => {
    if (!fileComplexityData) return [];
    
    // Optional: Group by directory if enabled
    if (groupByDirectory) {
      const directoryGroups: Record<string, FileComplexityData[]> = {};
      fileComplexityData.forEach(file => {
        const directory = file.path.split('/').slice(0, -1).join('/');
        if (!directoryGroups[directory]) {
          directoryGroups[directory] = [];
        }
        directoryGroups[directory].push(file);
      });
      
      return Object.entries(directoryGroups).map(([dir, files]) => ({
        path: dir,
        complexity: files.reduce((sum, f) => sum + f.complexity, 0) / files.length,
        size: files.reduce((sum, f) => sum + f.size, 0),
        changeFrequency: files.reduce((sum, f) => sum + f.changeFrequency, 0) / files.length,
        hotspotScore: files.reduce((sum, f) => sum + f.hotspotScore, 0) / files.length,
        children: files
      }));
    }
    
    return fileComplexityData;
  }, [fileComplexityData, groupByDirectory]);

  // Render
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Code Complexity Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        {/* View controls */}
        <div className="flex justify-between mb-4">
          <div className="space-x-2">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
            >
              Grid View
            </Button>
            <Button 
              variant={viewMode === 'treemap' ? 'default' : 'outline'}
              onClick={() => setViewMode('treemap')}
            >
              Treemap View
            </Button>
          </div>
          <Button 
            variant={groupByDirectory ? 'default' : 'outline'}
            onClick={() => setGroupByDirectory(!groupByDirectory)}
          >
            {groupByDirectory ? 'Grouped' : 'Flat'} View
          </Button>
        </div>

        {/* Heatmap visualization */}
        <div className={`
          flex flex-wrap justify-center items-center
          ${viewMode === 'treemap' ? 'flex-col' : 'flex-row'}
        `}>
          {processedData?.map((file) => (
            <HeatmapTile
              key={file.path}
              {...file}
              onSelect={(path) => setSelectedFile(path)}
              isSelected={selectedFile === file.path}
            />
          ))}
        </div>

        {/* Selected file details */}
        {selectedFile && (
          <div className="mt-4 p-4 bg-muted/10 rounded-lg">
            <h3 className="font-bold">Selected File: {selectedFile}</h3>
            {/* Add more detailed information about the selected file */}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComplexityHeatmap;