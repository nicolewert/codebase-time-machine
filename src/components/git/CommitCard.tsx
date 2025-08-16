import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Copy, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CommitCardProps {
  commit: {
    sha: string
    message: string
    author: {
      name: string
      email: string
      avatar?: string
    }
    date: Date
    fileChanges: {
      added: number
      deleted: number
      modified: number
    }
    tags?: string[]
  }
}

export const CommitCard: React.FC<CommitCardProps> = ({ commit }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const truncateMessage = (message: string, length: number = 100) => 
    message.length > length ? `${message.slice(0, length)}...` : message

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // TODO: Add toast notification for copy
  }

  return (
    <Card className="w-full mb-4 border-[1px] border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage 
              src={commit.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(commit.author.name)}`} 
              alt={commit.author.name} 
            />
            <AvatarFallback>{commit.author.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-sm font-semibold text-gray-800">
              {commit.author.name}
            </CardTitle>
            <p className="text-xs text-gray-500">
              {commit.date.toLocaleDateString()} {commit.date.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
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
            +{commit.fileChanges.added}
          </Badge>
          <Badge variant="outline" className="bg-red-50 text-red-700">
            -{commit.fileChanges.deleted}
          </Badge>
          {commit.tags?.map(tag => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-gray-700 mb-2">
          {truncateMessage(commit.message)}
        </p>
        {isExpanded && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">Full Commit Details</h4>
            <p className="text-xs text-gray-800 font-mono break-all">
              SHA: {commit.sha}
            </p>
            <pre className="text-xs text-gray-700 mt-2 whitespace-pre-wrap">
              {commit.message}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}