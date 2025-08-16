import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Copy, ChevronDown, ChevronUp, Bot } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AIAnalysisIndicator } from "@/components/claude/AIAnalysisIndicator"
import { CommitSummary } from "@/components/claude/CommitSummary"

interface EnhancedCommitCardProps {
  commit: {
    _id: string
    sha: string
    message: string
    author: string
    authorEmail: string
    date: number
    filesChanged: string[]
    linesAdded: number
    linesDeleted: number
    aiSummary?: string
    tags: string[]
    businessImpact?: string
    complexityScore?: number
  }
  repositoryId: string
  onAnalyzeCommit?: (commitId: string) => void
}

export const EnhancedCommitCard: React.FC<EnhancedCommitCardProps> = ({ 
  commit, 
  repositoryId, 
  onAnalyzeCommit 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const truncateMessage = (message: string, length: number = 100) => 
    message.length > length ? `${message.slice(0, length)}...` : message

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleAnalyzeCommit = async () => {
    if (!onAnalyzeCommit) return
    
    setIsAnalyzing(true)
    try {
      await onAnalyzeCommit(commit._id)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getAnalysisStatus = () => {
    if (isAnalyzing) return 'analyzing'
    if (commit.aiSummary && commit.aiSummary.includes('failed')) return 'error'
    if (commit.aiSummary) return 'complete'
    return 'pending'
  }

  const getConfidenceScore = () => {
    if (commit.complexityScore) {
      // Convert complexity score to confidence (inverse relationship)
      return Math.max(20, 100 - (commit.complexityScore * 8))
    }
    return undefined
  }

  return (
    <Card className="w-full mb-4 border-[1px] border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(commit.author)}`} 
              alt={commit.author} 
            />
            <AvatarFallback>{commit.author.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-sm font-semibold text-gray-800">
              {commit.author}
            </CardTitle>
            <p className="text-xs text-gray-500">
              {new Date(commit.date).toLocaleDateString()} {new Date(commit.date).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <AIAnalysisIndicator 
            status={getAnalysisStatus()}
            confidence={getConfidenceScore() || 0}
            isProcessing={isAnalyzing}
          />
          {getAnalysisStatus() === 'pending' && onAnalyzeCommit && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleAnalyzeCommit}
              disabled={isAnalyzing}
              className="text-blue-600 hover:text-blue-800"
            >
              <Bot className="h-4 w-4 mr-1" />
              Analyze
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => copyToClipboard(commit.sha)}
            aria-label="Copy Commit SHA"
          >
            <Copy className="h-4 w-4 text-gray-500 hover:text-blue-600" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Collapse Commit Details" : "Expand Commit Details"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <div className="flex items-center space-x-2 mb-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            +{commit.linesAdded}
          </Badge>
          <Badge variant="outline" className="bg-red-50 text-red-700">
            -{commit.linesDeleted}
          </Badge>
          {commit.tags?.map(tag => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          {commit.filesChanged.length > 0 && (
            <Badge variant="outline" className="text-gray-600">
              {commit.filesChanged.length} files
            </Badge>
          )}
        </div>

        <p className="text-sm text-gray-700 mb-2">
          {truncateMessage(commit.message)}
        </p>

        {/* AI Summary Section */}
        {commit.aiSummary && !commit.aiSummary.includes('failed') && (
          <CommitSummary 
            commit={{
              hash: commit.sha,
              message: commit.message,
              aiSummary: commit.aiSummary,
              businessImpact: commit.businessImpact || "",
              complexity: commit.complexityScore || 0,
              tags: commit.tags
            }}
            className="mb-3"
          />
        )}

        {isExpanded && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">Commit Details</h4>
            <p className="text-xs text-gray-800 font-mono break-all mb-2">
              SHA: {commit.sha}
            </p>
            {commit.filesChanged.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-600 mb-1">Files Changed:</p>
                <div className="text-xs text-gray-700 space-y-1">
                  {commit.filesChanged.slice(0, 10).map((file, index) => (
                    <div key={index} className="font-mono">{file}</div>
                  ))}
                  {commit.filesChanged.length > 10 && (
                    <div className="text-gray-500">... and {commit.filesChanged.length - 10} more files</div>
                  )}
                </div>
              </div>
            )}
            <pre className="text-xs text-gray-700 mt-2 whitespace-pre-wrap">
              {commit.message}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}