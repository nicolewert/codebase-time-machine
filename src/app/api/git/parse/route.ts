import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);

// Security: Define allowed base directories for repository access
const ALLOWED_BASE_DIRS = [
  '/tmp',
  '/var/tmp', 
  os.homedir(),
  process.cwd(),
];

// Security: Sanitize and validate repository paths
function sanitizeRepositoryPath(repoPath: string): string {
  // Resolve to absolute path and normalize
  const normalizedPath = path.resolve(path.normalize(repoPath));
  
  // Check if path is within allowed directories
  const isAllowed = ALLOWED_BASE_DIRS.some(baseDir => {
    const resolvedBaseDir = path.resolve(baseDir);
    return normalizedPath.startsWith(resolvedBaseDir);
  });
  
  if (!isAllowed) {
    throw new Error('Repository path is not in an allowed directory');
  }
  
  // Prevent directory traversal attacks
  if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
    throw new Error('Invalid characters in repository path');
  }
  
  return normalizedPath;
}

// Security: Sanitize file paths for git commands
function sanitizeFilePath(filePath: string): string {
  // Remove dangerous characters and normalize
  const sanitized = filePath.replace(/[;&|`$(){}\\[\\]]/g, '').trim();
  
  if (sanitized !== filePath) {
    throw new Error('Invalid characters in file path');
  }
  
  return sanitized;
}

// Performance: Check repository size before processing
async function checkRepositorySize(repoPath: string): Promise<{ sizeBytes: number, estimatedCommits: number }> {
  try {
    const gitDirPath = path.join(repoPath, '.git');
    const stats = await getDirectorySize(gitDirPath);
    
    // Rough estimate: 1KB per commit on average
    const estimatedCommits = Math.floor(stats / 1024);
    
    return { sizeBytes: stats, estimatedCommits };
  } catch (error) {
    return { sizeBytes: 0, estimatedCommits: 0 };
  }
}

async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;
  
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        totalSize += await getDirectorySize(itemPath);
      } else if (item.isFile()) {
        const stats = await fs.stat(itemPath);
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Ignore permission errors or missing files
  }
  
  return totalSize;
}

interface CommitData {
  sha: string;
  message: string;
  author: string;
  authorEmail: string;
  date: number;
  filesChanged: string[];
  linesAdded: number;
  linesDeleted: number;
  tags: string[];
}

interface FileData {
  path: string;
  extension: string;
  firstSeen: number;
  lastModified: number;
  totalChanges: number;
  currentSize: number;
  isDeleted: boolean;
  language?: string;
}

function detectLanguage(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.sh': 'shell',
    '.sql': 'sql',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.dockerfile': 'docker',
    '.r': 'r',
    '.m': 'matlab',
    '.pl': 'perl',
    '.lua': 'lua',
    '.vim': 'vim',
  };
  
  return languageMap[ext];
}

function calculateComplexity(content: string, language?: string): number {
  // Simple complexity calculation based on various factors
  let complexity = 1; // Base complexity
  
  // Count control structures
  const controlPatterns = [
    /\bif\b/g, /\belse\b/g, /\bwhile\b/g, /\bfor\b/g, 
    /\bswitch\b/g, /\bcase\b/g, /\btry\b/g, /\bcatch\b/g,
    /\bfunction\b/g, /\bclass\b/g, /\breturn\b/g
  ];
  
  controlPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  });
  
  // Add complexity based on nesting levels
  const maxNesting = Math.max(
    (content.match(/\{/g) || []).length - (content.match(/\}/g) || []).length,
    0
  );
  complexity += maxNesting * 2;
  
  // Language-specific complexity adjustments
  if (language === 'typescript' || language === 'javascript') {
    const asyncMatches = content.match(/\basync\b|\bawait\b/g);
    if (asyncMatches) complexity += asyncMatches.length;
  }
  
  return Math.min(complexity, 100); // Cap at 100
}

async function parseGitLog(repoPath: string): Promise<{ commits: CommitData[], files: Map<string, FileData> }> {
  try {
    // Security: Sanitize repository path
    const sanitizedRepoPath = sanitizeRepositoryPath(repoPath);
    
    // Performance: Check repository size and set limits
    const { sizeBytes, estimatedCommits } = await checkRepositorySize(sanitizedRepoPath);
    
    // Limit processing for very large repositories
    const MAX_REPO_SIZE = 50 * 1024 * 1024; // 50MB
    const MAX_COMMITS = 1000;
    
    if (sizeBytes > MAX_REPO_SIZE) {
      throw new Error(`Repository too large (${Math.round(sizeBytes / 1024 / 1024)}MB). Maximum allowed: ${MAX_REPO_SIZE / 1024 / 1024}MB`);
    }
    
    const commitLimit = Math.min(estimatedCommits, MAX_COMMITS);
    
    // Get commits with file statistics
    const { stdout: logOutput } = await execAsync(
      `git log --pretty=format:"%H|%s|%an|%ae|%ct" --numstat --max-count=${commitLimit}`,
      { 
        cwd: sanitizedRepoPath, 
        maxBuffer: 1024 * 1024 * 5, // 5MB buffer (reduced from 10MB)
        timeout: 60000 // 60 second timeout
      }
    );

    const commits: CommitData[] = [];
    const fileMap = new Map<string, FileData>();
    const lines = logOutput.split('\n');
    
    let currentCommit: Partial<CommitData> | null = null;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (line.includes('|') && line.split('|').length === 5) {
        // New commit line
        if (currentCommit) {
          commits.push(currentCommit as CommitData);
        }
        
        const parts = line.split('|');
        if (parts.length !== 5) {
          console.warn('Malformed commit line:', line);
          continue;
        }
        const [sha, message, author, authorEmail, dateStr] = parts;
        currentCommit = {
          sha,
          message: message.trim(),
          author: author.trim(),
          authorEmail: authorEmail.trim(),
          date: parseInt(dateStr) * 1000, // Convert to milliseconds
          filesChanged: [],
          linesAdded: 0,
          linesDeleted: 0,
          tags: [],
        };
      } else if (line && currentCommit && line.match(/^\d+\s+\d+\s+/)) {
        // File statistics line
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const [stats, , filePath] = parts;
          
          // Security: Sanitize file path
          try {
            const sanitizedFilePath = sanitizeFilePath(filePath);
            const [added, deleted] = stats.split(/\s+/);
            
            currentCommit.filesChanged!.push(sanitizedFilePath);
            currentCommit.linesAdded! += parseInt(added) || 0;
            currentCommit.linesDeleted! += parseInt(deleted) || 0;

            // Update file tracking
            const ext = path.extname(sanitizedFilePath);
            if (!fileMap.has(sanitizedFilePath)) {
              fileMap.set(sanitizedFilePath, {
                path: sanitizedFilePath,
                extension: ext,
                firstSeen: currentCommit.date!,
                lastModified: currentCommit.date!,
                totalChanges: 1,
                currentSize: 0,
                isDeleted: false,
                language: detectLanguage(sanitizedFilePath),
              });
            } else {
              const fileData = fileMap.get(sanitizedFilePath)!;
              fileData.lastModified = Math.max(fileData.lastModified, currentCommit.date!);
              fileData.totalChanges++;
              fileMap.set(sanitizedFilePath, fileData);
            }
          } catch (error) {
            console.warn('Skipping file with invalid path:', filePath, error);
            continue;
          }
        }
      }
      i++;
    }

    // Add the last commit
    if (currentCommit) {
      commits.push(currentCommit as CommitData);
    }

    // Get current file sizes and calculate complexity with proper error handling
    const fileProcessingPromises = Array.from(fileMap.entries()).map(async ([filePath, fileData]) => {
      try {
        const fullPath = path.join(sanitizedRepoPath, filePath);
        
        // Validate the constructed path is still safe
        const resolvedPath = path.resolve(fullPath);
        if (!resolvedPath.startsWith(sanitizedRepoPath)) {
          console.warn('Potential path traversal attempt, skipping file:', filePath);
          return;
        }
        
        const stats = await fs.stat(fullPath);
        fileData.currentSize = stats.size;
        
        // Read file content for complexity calculation with size limit
        if (stats.size > 1024 * 1024) { // Skip files larger than 1MB
          (fileData as any).maxComplexity = 1;
          (fileData as any).avgComplexity = 1;
          return;
        }
        
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const complexity = await Promise.resolve(calculateComplexity(content, fileData.language));
          (fileData as any).maxComplexity = complexity;
          (fileData as any).avgComplexity = complexity;
        } catch (readError) {
          // File might be binary or unreadable
          console.warn('Cannot read file for complexity analysis:', filePath, readError);
          (fileData as any).maxComplexity = 1;
          (fileData as any).avgComplexity = 1;
        }
      } catch (statError) {
        // File might be deleted
        console.warn('File not accessible:', filePath, statError);
        fileData.isDeleted = true;
        fileData.currentSize = 0;
        (fileData as any).maxComplexity = 0;
        (fileData as any).avgComplexity = 0;
      }
    });
    
    // Process files with concurrency limit to prevent resource exhaustion
    const CONCURRENCY_LIMIT = 10;
    for (let i = 0; i < fileProcessingPromises.length; i += CONCURRENCY_LIMIT) {
      const batch = fileProcessingPromises.slice(i, i + CONCURRENCY_LIMIT);
      await Promise.allSettled(batch);
    }

    // Extract authors for each file with parallelization and proper error handling
    const authorExtractionPromises = Array.from(fileMap.entries()).map(async ([filePath, fileData]) => {
      try {
        // Security: Use sanitized file path and repository path
        const sanitizedFilePath = sanitizeFilePath(filePath);
        const { stdout: authorOutput } = await execAsync(
          `git log --format="%an" -- "${sanitizedFilePath}" | sort | uniq -c | sort -nr | head -3`,
          { 
            cwd: sanitizedRepoPath,
            timeout: 10000, // 10 second timeout per file
            maxBuffer: 1024 * 64 // 64KB buffer for author data
          }
        );
        
        const authors = authorOutput
          .split('\n')
          .map(line => line.trim().replace(/^\d+\s+/, ''))
          .filter(author => author.length > 0 && author.length < 100); // Sanity check author names
        
        (fileData as any).primaryAuthors = authors;
      } catch (error) {
        console.warn('Failed to extract authors for file:', filePath, error);
        (fileData as any).primaryAuthors = [];
      }
    });
    
    // Process author extraction with concurrency control
    const AUTHOR_CONCURRENCY_LIMIT = 5;
    for (let i = 0; i < authorExtractionPromises.length; i += AUTHOR_CONCURRENCY_LIMIT) {
      const batch = authorExtractionPromises.slice(i, i + AUTHOR_CONCURRENCY_LIMIT);
      await Promise.allSettled(batch);
    }

    return { commits, files: fileMap };
  } catch (error) {
    console.error('Git parsing error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { repositoryPath, repositoryId } = await request.json();
    
    if (!repositoryPath || !repositoryId) {
      return NextResponse.json(
        { error: 'Repository path and ID are required' },
        { status: 400 }
      );
    }

    // Security: Validate and sanitize repository path
    let sanitizedRepositoryPath: string;
    try {
      sanitizedRepositoryPath = sanitizeRepositoryPath(repositoryPath);
      await fs.access(sanitizedRepositoryPath);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Repository path not found' },
        { status: 404 }
      );
    }

    const { commits, files } = await parseGitLog(sanitizedRepositoryPath);
    
    return NextResponse.json({
      success: true,
      data: {
        commits: commits.map(commit => ({
          ...commit,
          repositoryId,
          aiSummary: null,
          businessImpact: null,
          complexityScore: null,
        })),
        files: Array.from(files.values()).map(file => ({
          ...file,
          repositoryId,
        })),
      },
      stats: {
        totalCommits: commits.length,
        totalFiles: files.size,
        dateRange: commits.length > 0 ? {
          from: Math.min(...commits.map(c => c.date)),
          to: Math.max(...commits.map(c => c.date)),
        } : null,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to parse git repository', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}