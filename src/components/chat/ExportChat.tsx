"use client"

import React, { useState } from 'react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { Message } from '@/types/chat'
import { Copy, Download, Share2 } from 'lucide-react'

interface ExportChatProps {
  messages: Message[];
  sessionTitle?: string;
}

export function ExportChat({ messages, sessionTitle }: ExportChatProps) {
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  const exportFormats = {
    json: () => JSON.stringify(messages, null, 2),
    markdown: () => messages.map(m => 
      `**${m.type === 'user' ? 'You' : 'AI'}** (${new Date(m.timestamp).toLocaleString()}): 
${m.content}`
    ).join('\n\n'),
    text: () => messages.map(m => 
      `${m.type === 'user' ? 'You' : 'AI'}: ${m.content}`
    ).join('\n')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast("The chat content has been copied successfully.", "success")
    })
  }

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const generateShareLink = () => {
    // TODO: Implement actual share link generation logic
    const mockShareLink = `https://claude.ai/chat/${Date.now()}`
    setShareLink(mockShareLink)
    setIsDialogOpen(true)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" /> Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {Object.entries(exportFormats).map(([format, generateContent]) => (
            <DropdownMenuItem 
              key={format}
              onSelect={() => {
                const content = generateContent()
                downloadFile(
                  `${sessionTitle || 'chat'}_export.${format}`, 
                  content
                )
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export as {format.toUpperCase()}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem 
            onSelect={() => {
              const content = exportFormats.text()
              copyToClipboard(content)
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Plain Text
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={generateShareLink}>
            <Share2 className="mr-2 h-4 w-4" />
            Generate Share Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Conversation</DialogTitle>
            <DialogDescription>
              Generate a shareable link for this conversation
            </DialogDescription>
          </DialogHeader>
          
          {shareLink && (
            <div className="flex space-x-2">
              <Input 
                value={shareLink} 
                readOnly 
                className="flex-1" 
              />
              <Button 
                variant="outline" 
                onClick={() => copyToClipboard(shareLink)}
              >
                Copy
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}