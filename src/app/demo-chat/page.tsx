"use client"

import React, { useState, useEffect } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { ContextViewer } from '@/components/chat/ContextViewer'
import { ExportChat } from '@/components/chat/ExportChat'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Message, ContextSource } from '@/types/chat'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Badge } from '@/components/ui/badge'
import { Id } from '../../../convex/_generated/dataModel'

export default function DemoChatPage() {
  const [repositoryId, setRepositoryId] = useState<Id<"repositories"> | null>(null)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [contextSources, setContextSources] = useState<ContextSource[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const { toast, toasts } = useToast()
  
  // Convex hooks
  const repositories = useQuery(api.repositories.listRepositories, {})
  const askQuestionAction = useAction(api.ai.askQuestion)
  const createThreadAction = useAction(api.conversations.createThread)
  
  // Initialize with first available repository
  useEffect(() => {
    if (repositories && repositories.length > 0 && !repositoryId) {
      setRepositoryId(repositories[0]._id)
    }
  }, [repositories, repositoryId])

  const initializeChat = async () => {
    if (!repositoryId) {
      toast("Please select a repository first", "error")
      return
    }

    try {
      setIsLoading(true)
      
      // Create a new conversation thread
      const newThreadId = await createThreadAction({
        repositoryId,
        title: `Chat Session ${new Date().toLocaleTimeString()}`
      })
      
      if (typeof newThreadId === 'string') {
        setThreadId(newThreadId)
        
        // Add welcome message
        const welcomeMessage: Message = {
          id: '1',
          content: `Hello! I'm ready to help you understand your repository. I can answer questions about commits, code changes, file structure, and more. What would you like to know?`,
          type: 'assistant',
          timestamp: Date.now(),
          confidence: 1.0
        }
        
        setMessages([welcomeMessage])
        toast("Chat session initialized successfully!", "success")
      }
      
    } catch (error) {
      console.error('Failed to initialize chat:', error)
      toast("Failed to initialize chat session", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!repositoryId) {
      toast("No repository selected", "error")
      return
    }

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      type: 'user',
      timestamp: Date.now()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // First, build context for the question
      const contextResponse = await fetch('/api/ai/context-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId,
          question: content,
          threadId,
          maxCommits: 5,
          maxFiles: 3
        })
      })

      const contextData = await contextResponse.json()
      
      if (contextData.success) {
        setContextSources(contextData.contextSources)
      }

      // Ask the AI using Convex
      const result = await askQuestionAction({
        repositoryId,
        threadId,
        query: content,
        contextCommits: contextData.success ? contextData.contextSources
          .filter((s: any) => s.type === 'commit')
          .map((s: any) => s.metadata?.commitId)
          .filter(Boolean)
          .slice(0, 5) : [],
        contextFiles: contextData.success ? contextData.contextSources
          .filter((s: any) => s.type === 'file')
          .map((s: any) => s.reference)
          .slice(0, 3) : []
      })

      if (result.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: result.response,
          type: 'assistant',
          timestamp: Date.now() + 1000,
          confidence: result.confidence,
          contextSources: contextData.success ? contextData.contextSources.slice(0, 5) : []
        }
        
        setMessages(prev => [...prev, aiMessage])
        
        toast(
          `Response generated with ${result.confidence * 100}% confidence`, 
          result.confidence > 0.7 ? "success" : "warning"
        )
      } else {
        throw new Error(result.error || 'Unknown error')
      }

    } catch (error) {
      console.error('Error sending message:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: `I apologize, but I encountered an error while processing your question. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or rephrase your question.`,
        type: 'assistant',
        timestamp: Date.now() + 2000,
        confidence: 0
      }
      
      setMessages(prev => [...prev, errorMessage])
      toast("Error processing your question", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const selectedRepo = repositories?.find(repo => repo._id === repositoryId)

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-primary mb-2">
              Repository Chat Demo
            </h1>
            <p className="text-muted-foreground mb-4">
              Full end-to-end chat interface with Convex and Claude AI
            </p>
            
            {/* Repository Selection */}
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Repository:</span>
                {selectedRepo ? (
                  <Badge variant="secondary" className="text-sm">
                    {selectedRepo.name} ({selectedRepo.owner})
                  </Badge>
                ) : (
                  <Badge variant="outline">No repository selected</Badge>
                )}
              </div>
              
              <Button 
                onClick={initializeChat}
                disabled={!repositoryId || isLoading}
                variant={threadId ? "outline" : "default"}
              >
                {threadId ? "Restart Chat" : "Start Chat"}
              </Button>
            </div>
          </div>

          {/* Repository List */}
          {repositories && repositories.length === 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>No Repositories Found</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  No repositories are available in the database. Please clone a repository first.
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => window.location.href = '/test-repo'}
                >
                  Clone a Repository
                </Button>
              </CardContent>
            </Card>
          )}

          {repositories && repositories.length > 1 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Available Repositories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {repositories.map((repo) => (
                    <Button
                      key={repo._id}
                      variant={repositoryId === repo._id ? "default" : "outline"}
                      className="justify-start h-auto p-3"
                      onClick={() => setRepositoryId(repo._id)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{repo.name}</div>
                        <div className="text-sm text-muted-foreground">{repo.owner}</div>
                        <div className="text-xs text-muted-foreground">
                          {repo.totalCommits} commits • {repo.status}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chat Interface */}
          {repositoryId && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="h-[600px]">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>
                        Chat with {selectedRepo?.name || 'Repository'}
                        {threadId && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Thread Active
                          </Badge>
                        )}
                      </span>
                      <ExportChat 
                        messages={messages} 
                        sessionTitle={`${selectedRepo?.name} Chat Session`} 
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[500px] p-0">
                    <ChatInterface
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      isLoading={isLoading}
                    />
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Context Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ContextViewer contextSources={contextSources} />
                  </CardContent>
                </Card>

                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Session Info</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div><strong>Messages:</strong> {messages.length}</div>
                    <div><strong>Thread ID:</strong> {threadId || 'None'}</div>
                    <div><strong>Repository:</strong> {selectedRepo?.name || 'None'}</div>
                    <div><strong>Status:</strong> {selectedRepo?.status || 'Unknown'}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Toast Display */}
          {toasts.length > 0 && (
            <div className="fixed bottom-4 right-4 space-y-2 z-50">
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`p-3 rounded-lg text-sm shadow-lg ${
                    toast.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                    toast.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                    toast.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                    'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {toast.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}