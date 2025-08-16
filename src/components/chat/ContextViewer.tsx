"use client"

import React, { useState } from 'react'
import { ContextSource } from '@/types/chat'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface ContextViewerProps {
  contextSources: ContextSource[];
}

export function ContextViewer({ contextSources }: ContextViewerProps) {
  const [selectedSource, setSelectedSource] = useState<ContextSource | null>(null)

  const sourceTypeDetails = {
    commit: {
      icon: "🔑",
      color: "bg-blue-50 text-blue-800",
      description: "Commit Reference"
    },
    file: {
      icon: "📄",
      color: "bg-green-50 text-green-800",
      description: "File Source"
    },
    diff: {
      icon: "🔍",
      color: "bg-yellow-50 text-yellow-800",
      description: "Code Difference"
    }
  }

  const renderContextSourceCard = (source: ContextSource) => {
    const typeDetail = sourceTypeDetails[source.type]

    return (
      <Card 
        key={source.reference} 
        className="cursor-pointer hover:bg-accent"
        onClick={() => setSelectedSource(source)}
      >
        <CardHeader className="flex flex-row items-center space-x-4 py-3">
          <div className={cn(
            "p-2 rounded-full", 
            typeDetail.color
          )}>
            {typeDetail.icon}
          </div>
          <CardTitle className="text-sm">
            {source.reference}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              Relevance:
            </span>
            <Progress 
              value={source.relevanceScore * 100} 
              className="h-2 flex-1" 
            />
            <span className="text-xs text-muted-foreground">
              {(source.relevanceScore * 100).toFixed(0)}%
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderSourceDetails = (source: ContextSource) => {
    const typeDetail = sourceTypeDetails[source.type]

    return (
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>{typeDetail.icon}</span>
            <span>{source.reference}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className={cn(
            "p-3 rounded-lg text-sm",
            typeDetail.color
          )}>
            <strong>Type:</strong> {typeDetail.description}
          </div>
          
          {source.metadata && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(source.metadata, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Relevance:</span>
              <Progress 
                value={source.relevanceScore * 100} 
                className="w-40 h-2" 
              />
              <span className="text-sm">
                {(source.relevanceScore * 100).toFixed(0)}%
              </span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // TODO: Implement link to actual source
                console.log('Link to source:', source.reference)
              }}
            >
              View Source
            </Button>
          </div>
        </div>
      </DialogContent>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        Context Sources
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {contextSources.map(renderContextSourceCard)}
      </div>

      {selectedSource && (
        <Dialog 
          open={!!selectedSource} 
          onOpenChange={() => setSelectedSource(null)}
        >
          {renderSourceDetails(selectedSource)}
        </Dialog>
      )}
    </div>
  )
}