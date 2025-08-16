import React, { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2 } from "lucide-react"

export interface ChatMessage {
  /** Unique identifier for the message */
  id: string
  /** Sender of the message */
  sender: 'user' | 'ai'
  /** Content of the message */
  content: string
  /** Timestamp of when the message was sent */
  timestamp: Date
  /** Optional context used for generating the response */
  context?: {
    /** List of files referenced */
    files?: string[]
    /** Related commits */
    commits?: string[]
    /** Overall confidence score of the response */
    confidenceScore?: number
  }
  /** Upvote/downvote status */
  rating?: 'upvoted' | 'downvoted' | null
}

export interface ChatInterfaceProps {
  /** Repository identifier */
  repositoryId: string
  /** Function to submit a message and get AI response */
  onSubmit: (message: string) => Promise<void>
  /** Optional function to handle message rating */
  onRateMessage?: (messageId: string, rating: 'upvoted' | 'downvoted') => void
  /** Maximum input character limit */
  maxCharacters?: number
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  repositoryId, 
  onSubmit 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!inputMessage.trim()) return

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newUserMessage])
    setInputMessage('')
    setIsSubmitting(true)

    try {
      await onSubmit(inputMessage)
    } catch (error) {
      console.error('Failed to submit message:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.sender === 'user'
    return (
      <div 
        key={message.id} 
        className={`flex mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div 
          className={`
            max-w-[70%] p-2 rounded-lg 
            ${isUser 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-secondary text-secondary-foreground'
            }
          `}
        >
          <p className="text-sm">{message.content}</p>
          <small className="text-xs opacity-70 block text-right">
            {message.timestamp.toLocaleTimeString()}
          </small>
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4 space-y-4">
        <div 
          className="h-[300px] overflow-y-auto border rounded-md p-3 mb-2 bg-gray-50"
        >
          {messages.map(renderMessage)}
        </div>
        
        <div className="flex space-x-2">
          <Input 
            placeholder="Ask about the repository..." 
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={isSubmitting}
          />
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !inputMessage.trim()}
            size="icon"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ChatInterface