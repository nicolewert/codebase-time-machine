import React from 'react'
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle2, 
  CircleAlert, 
  GitBranch, 
  Upload, 
  Database, 
  Loader2 
} from "lucide-react"

type ParsePhase = 
  | 'pending' 
  | 'cloning' 
  | 'parsing' 
  | 'analyzing' 
  | 'indexing' 
  | 'completed' 
  | 'error'

interface ParseProgressProps {
  currentPhase: ParsePhase
  progress: number
  commitCount?: number
  errorMessage?: string
}

const phaseIcons = {
  pending: <CircleAlert className="text-gray-500" />,
  cloning: <Upload className="text-blue-500 animate-pulse" />,
  parsing: <GitBranch className="text-green-500 animate-pulse" />,
  analyzing: <Database className="text-purple-500 animate-pulse" />,
  indexing: <Loader2 className="text-orange-500 animate-spin" />,
  completed: <CheckCircle2 className="text-green-600" />,
  error: <CircleAlert className="text-red-500" />
}

const phaseDescriptions = {
  pending: 'Initializing repository parse',
  cloning: 'Cloning repository',
  parsing: 'Parsing commit history',
  analyzing: 'Analyzing repository structure',
  indexing: 'Indexing files and metadata',
  completed: 'Parse completed successfully',
  error: 'Parse encountered an error'
}

export const ParseProgress: React.FC<ParseProgressProps> = ({
  currentPhase,
  progress,
  commitCount,
  errorMessage
}) => {
  const progressStages: ParsePhase[] = [
    'pending', 
    'cloning', 
    'parsing', 
    'analyzing', 
    'indexing', 
    'completed'
  ]

  const currentStageIndex = progressStages.indexOf(currentPhase)

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center space-x-4 mb-4">
        {phaseIcons[currentPhase]}
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {phaseDescriptions[currentPhase]}
          </h3>
          {commitCount !== undefined && (
            <p className="text-sm text-gray-600">
              Processed {commitCount} commits
            </p>
          )}
        </div>
      </div>

      <Progress 
        value={progress} 
        className="w-full mb-4"
        indicatorClassName={
          currentPhase === 'error' 
            ? 'bg-red-500' 
            : 'bg-blue-500'
        }
      />

      {errorMessage && currentPhase === 'error' && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-md">
          <p className="text-sm text-red-700 font-medium">
            {errorMessage}
          </p>
        </div>
      )}

      <div className="flex justify-between mt-2">
        {progressStages.map((stage, index) => (
          <div 
            key={stage} 
            className={`
              h-1 w-full mx-1 rounded-full 
              ${index <= currentStageIndex 
                ? 'bg-blue-500' 
                : 'bg-gray-200'
              }
            `}
          />
        ))}
      </div>
    </div>
  )
}