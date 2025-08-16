"use client"

import React, { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatSession } from '@/types/chat'
import { cn } from "@/lib/utils"

interface ConversationHistoryProps {
  conversations: ChatSession[];
  onSelectConversation: (sessionId: string) => void;
  currentSessionId?: string;
}

export function ConversationHistory({ 
  conversations, 
  onSelectConversation, 
  currentSessionId 
}: ConversationHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredConversations = conversations.filter(session => 
    session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.messages.some(msg => 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="p-4 border-b">
        <Input 
          placeholder="Search conversations..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredConversations.map((session) => (
            <Card 
              key={session.id}
              className={cn(
                "cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                session.id === currentSessionId && "ring-2 ring-primary"
              )}
              onClick={() => onSelectConversation(session.id)}
            >
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-sm">
                  {session.title || "Untitled Conversation"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground py-2 px-4">
                <div>
                  {formatDate(session.createdAt)} 
                  {" - "}
                  {session.messages.length} messages
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredConversations.length === 0 && (
            <div className="text-center text-muted-foreground p-4">
              No conversations found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}