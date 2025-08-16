import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { 
  ChevronDown, 
  ChevronUp, 
  GitCommitIcon, 
  FileIcon, 
  CodeIcon 
} from "lucide-react"

// Interfaces for type safety
interface FileDetailsProps {
  fileId: string
  repositoryId: string
}

interface FileMetadata {
  path: string
  size: number
  language: string
  lastModified: Date
}

interface ComplexityMetrics {
  cyclomaticComplexity: number
  cognitiveComplexity: number
  hotspotScore: number
}

interface Contributor {
  name: string
  email: string
  commitPercentage: number
}

interface CommitEntry {
  id: string
  message: string
  author: string
  date: Date
  changes: number
}

const FileDetails: React.FC<FileDetailsProps> = ({ fileId, repositoryId }) => {
  // State management
  const [expandedCommits, setExpandedCommits] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  })

  // TODO: Replace with actual Convex query hooks
  const { fileMetadata, isLoading: metadataLoading } = useGetFileById(fileId)
  const { complexity, isLoading: complexityLoading } = useGetFileComplexity(fileId)
  const { commits, isLoading: commitsLoading } = useGetFileHistory(fileId, dateRange)
  const { contributors, isLoading: contributorsLoading } = useGetFileOwnership(fileId)

  // Commit expansion toggle
  const toggleCommitExpand = (commitId: string) => {
    setExpandedCommits(prev => 
      prev.includes(commitId) 
        ? prev.filter(id => id !== commitId)
        : [...prev, commitId]
    )
  }

  // Render loading state
  if (metadataLoading || complexityLoading || commitsLoading || contributorsLoading) {
    return <div>Loading file details...</div>
  }

  return (
    <div className="space-y-4 p-4 bg-background">
      {/* File Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-4">
            <FileIcon className="w-6 h-6 text-primary" />
            <CardTitle>{fileMetadata.path}</CardTitle>
          </div>
          <div className="flex space-x-2">
            <Badge variant="secondary">{fileMetadata.language}</Badge>
            <Badge variant="outline">{`${(fileMetadata.size / 1024).toFixed(2)} KB`}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Last Modified: {fileMetadata.lastModified.toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      {/* Complexity Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Complexity Metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <h4 className="text-sm font-medium">Cyclomatic Complexity</h4>
            <Progress value={complexity.cyclomaticComplexity * 10} />
            <p className="text-xs text-muted-foreground">
              {complexity.cyclomaticComplexity}/10
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Cognitive Complexity</h4>
            <Progress value={complexity.cognitiveComplexity * 10} />
            <p className="text-xs text-muted-foreground">
              {complexity.cognitiveComplexity}/10
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Hotspot Score</h4>
            <Progress value={complexity.hotspotScore * 10} />
            <p className="text-xs text-muted-foreground">
              {complexity.hotspotScore}/10
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contributors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Contributors</CardTitle>
        </CardHeader>
        <CardContent>
          {contributors.map(contributor => (
            <div key={contributor.email} className="mb-2">
              <div className="flex justify-between items-center">
                <span>{contributor.name}</span>
                <span className="text-muted-foreground">
                  {contributor.commitPercentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={contributor.commitPercentage} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Change Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Commit Message</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commits.map(commit => (
                <React.Fragment key={commit.id}>
                  <TableRow>
                    <TableCell>{commit.date.toLocaleDateString()}</TableCell>
                    <TableCell>{commit.author}</TableCell>
                    <TableCell>{commit.message}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{commit.changes} lines</Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toggleCommitExpand(commit.id)}
                      >
                        {expandedCommits.includes(commit.id) ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedCommits.includes(commit.id) && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="bg-muted p-3 rounded">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <CodeIcon className="w-4 h-4" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View Commit Details</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {/* Placeholder for commit details */}
                          <pre className="text-xs text-muted-foreground">
                            Commit details would be shown here
                          </pre>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// Placeholder hooks - replace with actual Convex queries
function useGetFileById(fileId: string) {
  // TODO: Implement Convex query
  return {
    fileMetadata: {
      path: 'src/components/FileDetails.tsx',
      size: 15360,
      language: 'TypeScript',
      lastModified: new Date()
    },
    isLoading: false
  }
}

function useGetFileComplexity(fileId: string) {
  // TODO: Implement Convex query
  return {
    complexity: {
      cyclomaticComplexity: 7,
      cognitiveComplexity: 6,
      hotspotScore: 5
    },
    isLoading: false
  }
}

function useGetFileHistory(fileId: string, dateRange: { start: Date; end: Date }) {
  // TODO: Implement Convex query
  return {
    commits: [
      {
        id: '1',
        message: 'Initial implementation of FileDetails component',
        author: 'Claude Code',
        date: new Date(),
        changes: 200
      }
    ],
    isLoading: false
  }
}

function useGetFileOwnership(fileId: string) {
  // TODO: Implement Convex query
  return {
    contributors: [
      {
        name: 'Claude Code',
        email: 'claude@anthropic.com',
        commitPercentage: 80
      },
      {
        name: 'Human Developer',
        email: 'dev@company.com',
        commitPercentage: 20
      }
    ],
    isLoading: false
  }
}

export default FileDetails