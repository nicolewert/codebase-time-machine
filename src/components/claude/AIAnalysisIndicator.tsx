import React from 'react'
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

export interface AIAnalysisIndicatorProps {
  /** Current status of AI analysis */
  status: 'pending' | 'analyzing' | 'complete' | 'error'
  /** Confidence score between 0-100 */
  confidence: number
  /** Whether the analysis is currently in progress */
  isProcessing: boolean
  /** Optional description or context for the analysis */
  description?: string
}

export const AIAnalysisIndicator: React.FC<AIAnalysisIndicatorProps> = ({ 
  status, 
  confidence, 
  isProcessing 
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-5 w-5 text-muted-foreground" />
      case 'analyzing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getConfidenceColor = () => {
    if (confidence < 40) return 'bg-red-500/70'
    if (confidence < 70) return 'bg-yellow-500/70'
    return 'bg-green-500/70'
  }

  return (
    <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg border">
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>
      
      <div className="flex-grow">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Progress 
                value={confidence} 
                className={`w-full h-2 ${getConfidenceColor()}`} 
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Confidence Score: {confidence}%</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <Badge variant={status === 'error' ? 'destructive' : 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    </div>
  )
}

export default AIAnalysisIndicator