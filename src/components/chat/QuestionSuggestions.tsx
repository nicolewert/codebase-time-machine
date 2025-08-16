"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface QuestionSuggestionsProps {
  suggestions: string[];
  onSuggestQuestion: (question: string) => void;
  isLoading?: boolean;
}

export function QuestionSuggestions({ 
  suggestions, 
  onSuggestQuestion, 
  isLoading 
}: QuestionSuggestionsProps) {
  if (isLoading) {
    return (
      <div className="flex space-x-2 p-4">
        {[1, 2, 3].map((_, index) => (
          <Skeleton key={index} className="h-10 w-1/3" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 bg-background border-t">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        Suggested Questions
      </h3>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <Button 
            key={index} 
            variant="outline" 
            size="sm"
            onClick={() => onSuggestQuestion(suggestion)}
            className="whitespace-normal break-words text-wrap"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  )
}