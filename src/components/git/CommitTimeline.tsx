import React, { useState, useCallback } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CommitCard } from './CommitCard'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
// DateRangePicker component not available - removing for now

type TimelineGrouping = 'day' | 'week' | 'month'

export const CommitTimeline: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [author, setAuthor] = useState('')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [grouping, setGrouping] = useState<TimelineGrouping>('day')

  // TODO: Fix query parameters
  const commits = useQuery(api.commits.getCommits, {
    repositoryId: "placeholder" as any, // Temporary fix
    limit: 50,
  })

  const groupCommits = useCallback((commits: any[]) => {
    if (!commits) return {}

    return commits.reduce((groups, commit) => {
      let key: string
      switch (grouping) {
        case 'day':
          key = commit.date.toLocaleDateString()
          break
        case 'week':
          // Get the start of the week
          const startOfWeek = new Date(commit.date)
          startOfWeek.setDate(commit.date.getDate() - commit.date.getDay())
          key = startOfWeek.toLocaleDateString()
          break
        case 'month':
          key = commit.date.toLocaleDateString('default', { month: 'long', year: 'numeric' })
          break
      }

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(commit)
      return groups
    }, {})
  }, [grouping])

  const groupedCommits = groupCommits(commits?.page || [])

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input 
          placeholder="Search commit messages" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
        <Input 
          placeholder="Filter by author" 
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="w-full"
        />
        <Select 
          value={grouping} 
          onValueChange={(value: TimelineGrouping) => setGrouping(value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Group By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* DateRangePicker component not available - temporarily commented out */}
      {/* <DateRangePicker
        date={dateRange}
        onDateChange={setDateRange}
        className="mb-6"
      /> */}

      {(commits?.page?.length === 0) && (
        <div className="text-center text-gray-500 py-6">
          No commits found matching your search criteria.
        </div>
      )}

      {Object.entries(groupedCommits).map(([groupKey, groupCommits]) => (
        <div key={groupKey} className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
            {groupKey}
          </h2>
          {(groupCommits as any[]).map(commit => (
            <CommitCard 
              key={commit.sha} 
              commit={{
                ...commit,
                date: new Date(commit.date)
              }} 
            />
          ))}
        </div>
      ))}
    </div>
  )
}