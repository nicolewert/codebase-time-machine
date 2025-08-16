import React, { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible"
import { 
  File, 
  Folder, 
  Code, 
  Image, 
  FilePlus2, 
  FileText, 
  ChevronRight 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type FileType = 'code' | 'image' | 'document' | 'other'

interface FileNode {
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  complexity?: number
  lines?: number
  changes?: number
}

const getFileIcon = (path: string): React.ReactNode => {
  const extension = path.split('.').pop()?.toLowerCase() || ''
  const fileType: FileType = 
    ['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs'].includes(extension) ? 'code' :
    ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(extension) ? 'image' :
    ['txt', 'md', 'doc', 'docx', 'pdf'].includes(extension) ? 'document' : 'other'

  const iconProps = { className: "mr-2 h-4 w-4 text-gray-500" }

  switch (fileType) {
    case 'code': return <Code {...iconProps} />
    case 'image': return <Image {...iconProps} />
    case 'document': return <FileText {...iconProps} />
    default: return <File {...iconProps} />
  }
}

const getComplexityColor = (complexity?: number) => {
  if (!complexity) return 'bg-gray-100 text-gray-700'
  if (complexity < 10) return 'bg-green-100 text-green-700'
  if (complexity < 50) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

export const FileExplorer: React.FC = () => {
  const [sortBy, setSortBy] = useState<'complexity' | 'changes' | 'name'>('complexity')
  const files = useQuery(api.files.getFiles)

  const sortFiles = (files: FileNode[]) => {
    return [...files].sort((a, b) => {
      switch (sortBy) {
        case 'complexity':
          return (b.complexity || 0) - (a.complexity || 0)
        case 'changes':
          return (b.changes || 0) - (a.changes || 0)
        case 'name':
          return a.path.localeCompare(b.path)
      }
    })
  }

  const renderFileTree = (nodes: FileNode[]) => {
    const sortedNodes = sortFiles(nodes)
    
    return sortedNodes.map(node => (
      <FileTreeNode 
        key={node.path} 
        node={node} 
        depth={0} 
      />
    ))
  }

  const FileTreeNode: React.FC<{ 
    node: FileNode, 
    depth?: number 
  }> = ({ node, depth = 0 }) => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <Collapsible 
        open={isOpen} 
        onOpenChange={setIsOpen}
        className="w-full"
      >
        <CollapsibleTrigger 
          className={`
            flex items-center justify-between w-full p-2 
            hover:bg-gray-100 rounded-md transition-colors
            ${node.type === 'directory' ? 'cursor-pointer' : 'cursor-default'}
          `}
        >
          <div className="flex items-center">
            {node.type === 'directory' ? (
              <ChevronRight 
                className={`
                  mr-2 h-4 w-4 transition-transform 
                  ${isOpen ? 'rotate-90' : ''}
                `} 
              />
            ) : (
              getFileIcon(node.path)
            )}
            <span className="text-sm font-medium">{node.path.split('/').pop()}</span>
          </div>
          
          {node.type === 'file' && (
            <div className="flex items-center space-x-2">
              {node.complexity !== undefined && (
                <Badge 
                  variant="outline" 
                  className={`
                    text-xs font-normal 
                    ${getComplexityColor(node.complexity)}
                  `}
                >
                  Complexity: {node.complexity}
                </Badge>
              )}
              {node.lines !== undefined && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {node.lines} lines
                </Badge>
              )}
            </div>
          )}
        </CollapsibleTrigger>
        
        {node.type === 'directory' && node.children && (
          <CollapsibleContent>
            <div 
              className="pl-6 border-l border-gray-200" 
              style={{ marginLeft: `${depth * 16}px` }}
            >
              {node.children.map(child => (
                <FileTreeNode 
                  key={child.path} 
                  node={child} 
                  depth={depth + 1} 
                />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Repository File Structure
        </h2>
        <div className="flex space-x-2">
          <Button 
            variant={sortBy === 'complexity' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('complexity')}
          >
            Complexity
          </Button>
          <Button 
            variant={sortBy === 'changes' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('changes')}
          >
            Changes
          </Button>
          <Button 
            variant={sortBy === 'name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('name')}
          >
            Name
          </Button>
        </div>
      </div>

      {files ? (
        <div className="space-y-2">
          {renderFileTree(files)}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-6">
          Loading repository structure...
        </div>
      )}
    </div>
  )
}