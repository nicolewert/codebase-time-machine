import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface CommitSummaryProps {
  /** Commit details from AI analysis */
  commit: {
    /** Unique commit hash */
    hash: string
    /** Original commit message */
    message: string
    /** AI-generated summary of the commit */
    aiSummary: string
    /** Business impact analysis */
    businessImpact: string
    /** Complexity score (0-100) */
    complexity: number
    /** Tags associated with the commit */
    tags: string[]
    /** Optional additional description */
    description?: string
  }
  /** Whether the summary can be expanded/collapsed */
  expandable?: boolean
  /** Additional CSS class names */
  className?: string
}

export const CommitSummary: React.FC<CommitSummaryProps> = ({ commit, className }) => {
  const getComplexityColor = () => {
    if (commit.complexity < 40) return 'bg-green-500'
    if (commit.complexity < 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card className={`w-full hover:shadow-md transition-shadow duration-300 ${className || ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Commit: {commit.hash.slice(0, 8)}
        </CardTitle>
        <div className="flex items-center space-x-2 mt-2">
          {commit.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm font-semibold">{commit.message}</p>
          
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">AI Summary</p>
            <p className="text-sm">{commit.aiSummary}</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Business Impact</p>
            <p className="text-sm">{commit.businessImpact}</p>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="w-full">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">Complexity</span>
                  <Progress 
                    value={commit.complexity} 
                    className={`flex-grow h-2 ${getComplexityColor()}`} 
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Complexity Score: {commit.complexity}%</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}

export default CommitSummary