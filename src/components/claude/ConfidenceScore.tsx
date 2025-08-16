import React from 'react'
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertCircle, CheckCircle } from "lucide-react"

export interface ConfidenceScoreProps {
  /** Confidence score between 0-100 */
  score: number
  /** Whether to show tooltip with detailed information */
  showTooltip?: boolean
  /** Optional description or context for the confidence score */
  description?: string
  /** Optional title for the confidence score */
  title?: string
}

export const ConfidenceScore: React.FC<ConfidenceScoreProps> = ({ 
  score, 
  showTooltip = true 
}) => {
  const getConfidenceColor = () => {
    if (score < 40) return 'bg-red-500'
    if (score < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getConfidenceLabel = () => {
    if (score < 40) return 'Low Confidence'
    if (score < 70) return 'Moderate Confidence'
    return 'High Confidence'
  }

  const renderConfidenceIndicator = () => (
    <div className="flex items-center space-x-2">
      <div className="w-full flex items-center space-x-2">
        <Progress 
          value={score} 
          className={`flex-grow h-2 ${getConfidenceColor()}`} 
        />
        {score >= 70 ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-500" />
        )}
      </div>
    </div>
  )

  const confidenceIndicator = renderConfidenceIndicator()

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="w-full">
            {confidenceIndicator}
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center space-x-2">
              <span>{getConfidenceLabel()}</span>
              <span className="font-bold">{score}%</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return confidenceIndicator
}

export default ConfidenceScore