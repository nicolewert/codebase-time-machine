'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { EnhancedCommitCard } from '@/components/git/EnhancedCommitCard'
import { ChatInterface } from '@/components/claude/ChatInterface'
import { Bot, GitBranch, MessageSquare } from 'lucide-react'

export default function ClaudeDemo() {
  const [selectedRepo, setSelectedRepo] = useState<Id<'repositories'> | null>(null)
  
  // Get repositories
  const repositories = useQuery(api.repositories.getAllRepositories) || []
  
  // Get commits for selected repository
  const commits = useQuery(
    api.commits.getCommits,
    selectedRepo ? { repositoryId: selectedRepo, limit: 10 } : 'skip'
  )

  // Get questions for selected repository
  const questions = useQuery(
    api.commits.getQuestions,
    selectedRepo ? { repositoryId: selectedRepo } : 'skip'
  )

  // Use first repository as default
  useEffect(() => {
    if (repositories.length > 0 && !selectedRepo) {
      setSelectedRepo(repositories[0]._id)
    }
  }, [repositories, selectedRepo])

  const handleAnalyzeCommit = async (commitId: string) => {
    try {
      const response = await fetch('/api/ai/analyze-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitId,
          diff: '// Sample diff would be provided by git integration',
          commitMessage: 'Sample commit message',
          filesChanged: ['src/example.ts', 'README.md']
        })
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const result = await response.json()
      console.log('Analysis result:', result)
    } catch (error) {
      console.error('Failed to analyze commit:', error)
    }
  }

  const handleAskQuestion = async (query: string) => {
    if (!selectedRepo) return

    try {
      const response = await fetch('/api/ai/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: selectedRepo,
          query,
          contextCommits: commits?.page?.slice(0, 3).map(c => c._id) || [],
          contextFiles: []
        })
      })

      if (!response.ok) {
        throw new Error('Question processing failed')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Failed to process question:', error)
      throw error
    }
  }

  const selectedRepository = repositories.find(r => r._id === selectedRepo)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <Badge variant="secondary" className="mb-2">
            <Bot className="h-3 w-3 mr-1" />
            Claude API Integration Demo
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">
            AI-Powered Code Analysis
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Semantic commit analysis, architectural insights, and natural language code Q&A powered by Claude AI.
          </p>
        </div>

        {/* Repository Selection */}
        {repositories.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <GitBranch className="h-5 w-5 mr-2" />
                Available Repositories
              </CardTitle>
              <CardDescription>
                Select a repository to explore AI-powered commit analysis and Q&A
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {repositories.map((repo) => (
                  <Button
                    key={repo._id}
                    variant={selectedRepo === repo._id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRepo(repo._id)}
                  >
                    {repo.name}
                    <Badge variant="secondary" className="ml-2">
                      {repo.totalCommits}
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedRepository ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Commits Section */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Commits</CardTitle>
                  <CardDescription>
                    AI-enhanced commit analysis with semantic summaries and complexity scoring
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {commits?.page?.map((commit) => (
                    <EnhancedCommitCard
                      key={commit._id}
                      commit={commit}
                      repositoryId={selectedRepo!}
                      onAnalyzeCommit={handleAnalyzeCommit}
                    />
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No commits found for this repository</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Q&A Section */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Code Q&A
                  </CardTitle>
                  <CardDescription>
                    Ask questions about the codebase using natural language
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChatInterface
                    repositoryId={selectedRepo!}
                    onSubmit={async (message) => {
                      try {
                        await handleAskQuestion(message)
                      } catch (error) {
                        console.error('Failed to send message:', error)
                      }
                    }}
                  />
                </CardContent>
              </Card>

              {/* Feature Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>AI Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="mt-0.5">
                        1
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">Semantic Analysis</p>
                        <p className="text-xs text-muted-foreground">
                          AI-generated commit summaries with business impact assessment
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="mt-0.5">
                        2
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">Complexity Scoring</p>
                        <p className="text-xs text-muted-foreground">
                          Automated complexity assessment and confidence ratings
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="mt-0.5">
                        3
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">Smart Tagging</p>
                        <p className="text-xs text-muted-foreground">
                          Automatic categorization with relevant tags
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="mt-0.5">
                        4
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">Natural Language Q&A</p>
                        <p className="text-xs text-muted-foreground">
                          Ask questions about codebase patterns and architecture
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Repositories Found</h3>
              <p className="text-muted-foreground mb-4">
                Clone a repository first to explore AI-powered code analysis features.
              </p>
              <Button asChild>
                <a href="/test-repo">Clone Repository</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}