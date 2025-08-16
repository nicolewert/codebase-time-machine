import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

// Interfaces for type safety
interface Repository {
  _id: string;
  url: string;
  name: string;
  owner: string;
  clonedAt: number;
  lastAnalyzed: number;
  status: "cloning" | "analyzing" | "ready" | "error";
  errorMessage?: string;
  totalCommits: number;
  totalFiles: number;
  primaryLanguage?: string;
}

interface RepoCardProps {
  repository: Repository;
  onSelect?: (id: string) => void;
  onAnalyze?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

// Status badge color mapping
const STATUS_COLORS = {
  cloning: "bg-blue-500 text-white",
  analyzing: "bg-yellow-500 text-white",
  ready: "bg-green-500 text-white",
  error: "bg-red-500 text-white"
};

export function RepoCard({ 
  repository, 
  onSelect, 
  onAnalyze, 
  onDelete, 
  showActions = true 
}: RepoCardProps) {
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle action buttons with loading state
  const handleAction = async (action: 'select' | 'analyze' | 'delete') => {
    setIsLoading(true);
    try {
      switch (action) {
        case 'select':
          onSelect?.(repository._id);
          break;
        case 'analyze':
          onAnalyze?.(repository._id);
          break;
        case 'delete':
          onDelete?.(repository._id);
          break;
      }
    } catch (error) {
      console.error(`Error in ${action} action:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Progress calculation for cloning/analyzing states
  const getProgress = () => {
    switch (repository.status) {
      case 'cloning': return 50;
      case 'analyzing': return 75;
      default: return 100;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-secondary-foreground">
            {repository.name}
          </CardTitle>
          <Badge 
            className={`${STATUS_COLORS[repository.status]} rounded-md text-xs`}
          >
            {repository.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Progress Indicator for Active States */}
        {['cloning', 'analyzing'].includes(repository.status) && (
          <Progress 
            value={getProgress()} 
            className="mb-4 bg-gray-200"
          />
        )}

        {/* Repository Metadata */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div>
            <strong>Owner:</strong> {repository.owner}
          </div>
          <div>
            <strong>Cloned:</strong> {formatDistanceToNow(new Date(repository.clonedAt), { addSuffix: true })}
          </div>
          <div className="flex justify-between">
            <span><strong>Commits:</strong> {repository.totalCommits}</span>
            <span><strong>Files:</strong> {repository.totalFiles}</span>
            {repository.primaryLanguage && (
              <span><strong>Language:</strong> {repository.primaryLanguage}</span>
            )}
          </div>
        </div>

        {/* Error State Handling */}
        {repository.status === 'error' && (
          <Collapsible 
            open={isErrorExpanded} 
            onOpenChange={setIsErrorExpanded} 
            className="mt-4"
          >
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                An error occurred during repository processing
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-2 text-destructive-foreground hover:bg-destructive/10"
                  >
                    {isErrorExpanded ? (
                      <>Hide Details <ChevronUp className="ml-1 h-4 w-4" /></>
                    ) : (
                      <>Show Details <ChevronDown className="ml-1 h-4 w-4" /></>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </AlertDescription>
            </Alert>
            <CollapsibleContent>
              <div className="bg-destructive/10 p-3 rounded-md mt-2 text-sm">
                {repository.errorMessage || 'No additional error details available.'}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex justify-between space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => handleAction('select')}
              disabled={isLoading || repository.status !== 'ready'}
              className="w-full"
            >
              View
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => handleAction('analyze')}
              disabled={isLoading || repository.status === 'analyzing'}
              className="w-full"
            >
              {repository.status === 'analyzing' ? 'Analyzing...' : 'Analyze'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleAction('delete')}
              disabled={isLoading}
              className="w-full"
            >
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}