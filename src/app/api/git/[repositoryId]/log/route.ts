import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
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

// Security: Sanitize parameters for git commands
function sanitizeGitParameter(param: string): string {
  // Remove dangerous characters
  const sanitized = param.replace(/[;&|`$(){}\\[\]]/g, '').trim();
  
  if (sanitized !== param) {
    throw new Error('Invalid characters in parameter');
  }
  
  return sanitized;
}

interface GitLogParams {
  repositoryId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<GitLogParams> }
) {
  try {
    const { repositoryId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const repoPath = searchParams.get('path');
    const format = searchParams.get('format') || 'pretty';
    const maxCount = parseInt(searchParams.get('max-count') || '100');
    const since = searchParams.get('since');
    const until = searchParams.get('until');
    const author = searchParams.get('author');
    const grep = searchParams.get('grep');
    const filePath = searchParams.get('file');
    const stat = searchParams.get('stat') === 'true';
    const numstat = searchParams.get('numstat') === 'true';
    
    if (!repoPath) {
      return NextResponse.json(
        { error: 'Repository path is required' },
        { status: 400 }
      );
    }

    // Security: Validate and sanitize repository path
    let sanitizedRepoPath: string;
    try {
      sanitizedRepoPath = sanitizeRepositoryPath(repoPath);
      await fs.access(sanitizedRepoPath);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Repository path not found' },
        { status: 404 }
      );
    }

    // Build git log command
    let gitCommand = 'git log';
    
    // Add format
    if (format === 'pretty') {
      gitCommand += ' --pretty=format:"%H|%s|%an|%ae|%ct|%P"';
    } else if (format === 'oneline') {
      gitCommand += ' --oneline';
    } else if (format === 'short') {
      gitCommand += ' --pretty=short';
    }
    
    // Add statistics options
    if (stat) {
      gitCommand += ' --stat';
    }
    if (numstat) {
      gitCommand += ' --numstat';
    }
    
    // Add constraints
    if (maxCount > 0 && maxCount <= 1000) { // Limit to prevent abuse
      gitCommand += ` --max-count=${maxCount}`;
    }
    
    // Security: Sanitize parameters before using in command
    if (since) {
      const sanitizedSince = sanitizeGitParameter(since);
      gitCommand += ` --since="${sanitizedSince}"`;
    }
    
    if (until) {
      const sanitizedUntil = sanitizeGitParameter(until);
      gitCommand += ` --until="${sanitizedUntil}"`;
    }
    
    if (author) {
      const sanitizedAuthor = sanitizeGitParameter(author);
      gitCommand += ` --author="${sanitizedAuthor}"`;
    }
    
    if (grep) {
      const sanitizedGrep = sanitizeGitParameter(grep);
      gitCommand += ` --grep="${sanitizedGrep}"`;
    }
    
    // Add file path filter with sanitization
    if (filePath) {
      const sanitizedFilePath = sanitizeGitParameter(filePath);
      gitCommand += ` -- "${sanitizedFilePath}"`;
    }

    console.log('Executing git command:', gitCommand);
    
    const { stdout, stderr } = await execAsync(gitCommand, {
      cwd: sanitizedRepoPath,
      maxBuffer: 1024 * 1024 * 5, // 5MB buffer (reduced from 10MB)
      timeout: 60000, // 60 second timeout (increased for safety)
    });

    if (stderr && !stdout) {
      return NextResponse.json(
        { error: 'Git command failed', details: stderr },
        { status: 500 }
      );
    }

    // Parse the output based on format
    let parsedData;
    
    if (format === 'pretty' && !stat && !numstat) {
      // Parse structured format
      const commits = stdout.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => {
          const [sha, message, author, authorEmail, timestamp, parents] = line.split('|');
          return {
            sha: sha?.replace(/"/g, ''),
            message: message?.replace(/"/g, ''),
            author: author?.replace(/"/g, ''),
            authorEmail: authorEmail?.replace(/"/g, ''),
            date: parseInt(timestamp?.replace(/"/g, '')) * 1000,
            parents: parents?.replace(/"/g, '').split(' ').filter(p => p.length > 0) || [],
          };
        });
      
      parsedData = { commits, raw: stdout };
    } else {
      // Return raw output for complex formats
      parsedData = { raw: stdout };
    }

    return NextResponse.json({
      success: true,
      repositoryId,
      command: gitCommand,
      data: parsedData,
      metadata: {
        executedAt: new Date().toISOString(),
        format,
        constraints: {
          maxCount,
          since,
          until,
          author,
          grep,
          filePath,
          stat,
          numstat,
        },
      },
    });

  } catch (error) {
    console.error('Git log API error:', error);
    
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        { error: 'Git operation timed out', details: 'Repository analysis is taking too long' },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to execute git log', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// POST method for complex git operations
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<GitLogParams> }
) {
  try {
    const { repositoryId } = await params;
    const { command, repoPath, options = {} } = await request.json();
    
    if (!repoPath || !command) {
      return NextResponse.json(
        { error: 'Repository path and command are required' },
        { status: 400 }
      );
    }

    // Security: Validate and sanitize repository path
    let sanitizedRepoPath: string;
    try {
      sanitizedRepoPath = sanitizeRepositoryPath(repoPath);
      await fs.access(sanitizedRepoPath);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Repository path not found' },
        { status: 404 }
      );
    }

    // Whitelist allowed git commands for security
    const allowedCommands = [
      'git log',
      'git show',
      'git diff',
      'git blame',
      'git ls-files',
      'git rev-list',
      'git branch',
      'git tag',
      'git status --porcelain',
    ];

    const isAllowed = allowedCommands.some(allowed => command.startsWith(allowed));
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Command not allowed', allowedCommands },
        { status: 403 }
      );
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: sanitizedRepoPath,
      maxBuffer: options.maxBuffer || 1024 * 1024 * 5, // 5MB buffer (reduced from 10MB)
      timeout: options.timeout || 60000, // 60 second timeout
    });

    return NextResponse.json({
      success: true,
      repositoryId,
      command,
      data: {
        stdout,
        stderr,
      },
      metadata: {
        executedAt: new Date().toISOString(),
        options,
      },
    });

  } catch (error) {
    console.error('Git command API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute git command', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}