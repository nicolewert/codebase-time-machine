"use client"

import React, { useState } from 'react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { ContextViewer } from '@/components/chat/ContextViewer'
import { ExportChat } from '@/components/chat/ExportChat'
import { Message, ContextSource } from '@/types/chat'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

export default function TestChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I can help you understand your codebase. What would you like to know?',
      type: 'assistant',
      timestamp: Date.now() - 10000,
      confidence: 0.95,
      contextSources: [
        {
          type: 'commit',
          reference: 'abc123 - Initial setup',
          relevanceScore: 0.8,
          metadata: { sha: 'abc123', author: 'dev' }
        }
      ]
    }
  ])
  
  const [contextSources, setContextSources] = useState<ContextSource[]>([
    {
      type: 'commit',
      reference: 'abc123 - Initial setup',
      relevanceScore: 0.8,
      metadata: { sha: 'abc123', author: 'dev' }
    },
    {
      type: 'file',
      reference: 'src/components/chat/ChatInterface.tsx',
      relevanceScore: 0.7,
      metadata: { language: 'typescript', lines: 134 }
    },
    {
      type: 'diff',
      reference: 'Previous conversation context',
      relevanceScore: 0.6,
      metadata: { messageCount: 3 }
    }
  ])
  
  const [isLoading, setIsLoading] = useState(false)
  const { toast, toasts } = useToast()

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      type: 'user',
      timestamp: Date.now()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Simulate API call with actual logic
      const repositoryId = 'test-repo-id'
      
      // Build context for the question
      const contextResponse = await fetch('/api/ai/context-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId,
          question: content,
          maxCommits: 3,
          maxFiles: 2
        })
      })

      const contextData = await contextResponse.json()
      
      if (contextData.success) {
        setContextSources(contextData.contextSources)
      }

      // Simulate AI response (in real implementation, this would call Convex action)
      setTimeout(() => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `I understand you're asking about "${content}". Based on the repository context, here's what I found:\n\nThis appears to be a Next.js project with a conversational AI interface. The codebase includes chat components, Convex database integration, and TypeScript throughout.\n\nWould you like me to explain any specific part in more detail?`,
          type: 'assistant',
          timestamp: Date.now() + 1000,
          confidence: 0.85,
          contextSources: contextData.success ? contextData.contextSources.slice(0, 3) : []
        }
        
        setMessages(prev => [...prev, aiMessage])
        setIsLoading(false)
        toast("Message processed successfully", "success")
      }, 2000)

    } catch (error) {
      console.error('Error sending message:', error)
      setIsLoading(false)
      toast("Error processing message. Please try again.", "error")
    }
  }

  const testConvexConnection = async () => {
    try {
      // Test basic Convex connection by fetching repositories
      const response = await fetch('/api/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://github.com/test/test',
          action: 'validate'
        })
      })
      
      if (response.ok) {
        toast("Convex connection working!", "success")
      } else {
        toast("Convex connection issue detected", "warning")
      }
    } catch (error) {
      toast("Failed to test Convex connection", "error")
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Chat Interface Test
          </h1>
          <p className="text-muted-foreground">
            Testing the conversational AI interface for repository Q&A
          </p>
          <div className="flex space-x-2 mt-4">
            <Button onClick={testConvexConnection} variant="outline">
              Test Convex Connection
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Chat Interface
                  <ExportChat messages={messages} sessionTitle="Test Chat Session" />
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

          {/* Context Viewer */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Context Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <ContextViewer contextSources={contextSources} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Toast Display */}
        {toasts.length > 0 && (
          <div className="fixed bottom-4 right-4 space-y-2">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`p-3 rounded-lg text-sm ${
                  toast.type === 'success' ? 'bg-green-100 text-green-800' :
                  toast.type === 'error' ? 'bg-red-100 text-red-800' :
                  toast.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}
              >
                {toast.message}
              </div>
            ))}
          </div>
        )}

        {/* Debug Info */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Messages:</strong> {messages.length}</p>
                <p><strong>Context Sources:</strong> {contextSources.length}</p>
                <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
                <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}