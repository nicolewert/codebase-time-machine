"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Message, ContextSource } from '@/types/chat'
import { cn } from "@/lib/utils"

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
}

const ContextSourceBadge = ({ source }: { source: ContextSource }) => {
  const typeColors = {
    commit: 'bg-blue-100 text-blue-800',
    file: 'bg-green-100 text-green-800',
    diff: 'bg-yellow-100 text-yellow-800'
  }

  return (
    <span 
      className={cn(
        'px-2 py-1 rounded-md text-xs mr-1 mb-1 inline-block',
        typeColors[source.type]
      )}
      title={`Relevance: ${source.relevanceScore * 100}%`}
    >
      {source.type}: {source.reference}
    </span>
  )
}

const MessageBubble = ({ message }: { message: Message }) => {
  const isAssistant = message.type === 'assistant'
  
  return (
    <div 
      className={cn(
        'flex flex-col mb-4 max-w-[80%]',
        isAssistant ? 'self-start' : 'self-end ml-auto'
      )}
    >
      <div 
        className={cn(
          'px-4 py-2 rounded-lg shadow-sm',
          isAssistant 
            ? 'bg-secondary text-secondary-foreground' 
            : 'bg-primary text-primary-foreground'
        )}
      >
        {message.content}
        
        {message.confidence && (
          <div className="text-xs opacity-70 mt-1">
            Confidence: {(message.confidence * 100).toFixed(2)}%
          </div>
        )}
      </div>
      
      {message.contextSources && message.contextSources.length > 0 && (
        <div className="mt-2 flex flex-wrap">
          {message.contextSources.map((source, idx) => (
            <ContextSourceBadge key={idx} source={source} />
          ))}
        </div>
      )}
      
      <div className="text-xs text-muted-foreground mt-1">
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  )
}

export function ChatInterface({ 
  messages, 
  onSendMessage, 
  isLoading 
}: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return

    await onSendMessage(inputMessage)
    setInputMessage('')
  }

  return (
    <div className="flex flex-col h-full bg-background" data-testid="chat-interface">
      <ScrollArea className="flex-1 p-4 overflow-y-auto">
        <div className="flex flex-col">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="self-start bg-secondary text-secondary-foreground px-4 py-2 rounded-lg animate-pulse">
              Thinking...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      <div className="border-t p-4 flex space-x-2">
        <Input 
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask a question about the repository..."
          className="flex-1"
          data-testid="message-input"
        />
        <Button 
          onClick={handleSendMessage} 
          disabled={isLoading || inputMessage.trim() === ''}
          data-testid="send-button"
        >
          Send
        </Button>
      </div>
    </div>
  )
}