import React, { useState, useMemo, useCallback } from 'react';
import { FixedSizeList as VirtualList } from 'react-window';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';

import { 
  FolderIcon, 
  FileIcon, 
  FileCodeIcon, 
  FileTextIcon, 
  FileSpreadsheetIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from 'lucide-react';

// Typescript interfaces
interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  depth: number;
  size?: number;
  complexity?: number;
  changeFrequency?: number;
  hotspotScore?: number;
  primaryAuthors?: string[];
}

// Helper function to get file type icon
const getFileIcon = (path: string) => {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
    case 'py':
    case 'rb':
      return <FileCodeIcon className="w-4 h-4 text-blue-500" />;
    case 'txt':
    case 'md':
      return <FileTextIcon className="w-4 h-4 text-gray-500" />;
    case 'csv':
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheetIcon className="w-4 h-4 text-green-500" />;
    default:
      return <FileIcon className="w-4 h-4 text-gray-400" />;
  }
};

// Complexity color mapping
const getComplexityColor = (complexity?: number) => {
  if (!complexity) return 'bg-gray-200 text-gray-800';
  if (complexity < 5) return 'bg-green-100 text-green-800';
  if (complexity < 10) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

export function FileExplorer({ 
  repositoryId, 
  initialSortBy = 'name', 
  initialSortOrder = 'asc' 
}: { 
  repositoryId: Id<'repositories'>, 
  initialSortBy?: 'name' | 'size' | 'complexity' | 'changes' | 'hotspot', 
  initialSortOrder?: 'asc' | 'desc' 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<typeof initialSortBy>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<typeof initialSortOrder>(initialSortOrder);
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Fetch file tree
  const fileTree = useQuery(api.files.getFileTree, { 
    repositoryId, 
    sortBy, 
    sortOrder,
    filterByLanguage: languageFilter || undefined 
  });

  // Filter and flatten tree for search and virtual list
  const filteredFlatTree = useMemo(() => {
    if (!fileTree) return [];

    const flattenTree = (nodes: FileTreeNode[], parentPath = ''): FileTreeNode[] => {
      return nodes.flatMap(node => {
        const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
        const matches = node.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const nodeWithPath = { ...node, path: fullPath };
        
        // Include if it matches search or is an ancestor of a match
        const includeNode = matches || 
          (node.children && 
            node.children.some(child => 
              child.name.toLowerCase().includes(searchTerm.toLowerCase())
            ));

        return [
          ...(includeNode ? [nodeWithPath] : []),
          ...(node.children && (expandedPaths.has(fullPath) || matches)
            ? flattenTree(node.children, fullPath)
            : [])
        ];
      });
    };

    return flattenTree(fileTree);
  }, [fileTree, searchTerm, expandedPaths]);

  // Toggle directory expansion
  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Render individual row
  const renderRow = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const node = filteredFlatTree[index];
    const isDirectory = node.type === 'directory';

    return (
      <div 
        style={{
          ...style, 
          paddingLeft: `${node.depth * 20}px`,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}
        className="hover:bg-gray-50 cursor-pointer"
      >
        {isDirectory ? (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => toggleExpand(node.path)}
            className="mr-2"
          >
            {expandedPaths.has(node.path) ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
          </Button>
        ) : (
          <div className="mr-2">{getFileIcon(node.path)}</div>
        )}

        <div className="flex-grow flex items-center">
          <span>{node.name}</span>
          
          {node.complexity !== undefined && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge 
                    variant="outline" 
                    className={`ml-2 ${getComplexityColor(node.complexity)}`}
                  >
                    {node.complexity}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Complexity Score: High complexity may indicate potential code quality issues
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {node.hotspotScore !== undefined && node.hotspotScore > 5 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="destructive" className="ml-2">
                    Hotspot
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  High-risk file: Frequently changed and complex
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="text-xs text-gray-500 ml-auto">
          {node.size && `${(node.size / 1024).toFixed(1)} KB`}
        </div>
      </div>
    );
  };

  // Unique language filter extraction
  const languages = useMemo(() => {
    if (!fileTree) return [];
    const uniqueLanguages = new Set<string>();
    const extractLanguages = (nodes: FileTreeNode[]) => {
      nodes.forEach(node => {
        // @ts-ignore - language might not be part of the type
        if (node.language) uniqueLanguages.add(node.language);
        if (node.children) extractLanguages(node.children);
      });
    };
    extractLanguages(fileTree);
    return Array.from(uniqueLanguages).sort();
  }, [fileTree]);

  if (!fileTree) {
    return (
      <Card className="w-full h-96 flex items-center justify-center">
        Loading file tree...
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <div className="p-4 border-b flex space-x-2">
        <Input 
          placeholder="Search files..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
        />
        
        <Select 
          value={languageFilter || undefined} 
          onValueChange={(value) => setLanguageFilter(value || null)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {languages.map(lang => (
              <SelectItem key={lang} value={lang}>{lang}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={sortBy} 
          onValueChange={(value) => setSortBy(value as typeof sortBy)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="size">Size</SelectItem>
            <SelectItem value="complexity">Complexity</SelectItem>
            <SelectItem value="changes">Changes</SelectItem>
            <SelectItem value="hotspot">Hotspot</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <VirtualList
        height={600}  // Fixed height, adjust as needed
        itemCount={filteredFlatTree.length}
        itemSize={40}
        width="100%"
      >
        {renderRow}
      </VirtualList>
    </Card>
  );
}