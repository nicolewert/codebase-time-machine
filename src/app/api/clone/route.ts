import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface CloneRequest {
  repositoryId: string;
  url?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { repositoryId, url }: CloneRequest = await request.json();

    if (!repositoryId) {
      return NextResponse.json(
        { error: 'Repository ID is required' },
        { status: 400 }
      );
    }

    // Get repository details if URL not provided
    let repoUrl = url;
    if (!repoUrl) {
      const repo = await convex.query(api.repositories.getRepository, {
        id: repositoryId as Id<"repositories">,
      });
      
      if (!repo) {
        return NextResponse.json(
          { error: 'Repository not found' },
          { status: 404 }
        );
      }
      
      repoUrl = repo.url;
    }

    // Validate Git URL
    if (!isValidGitUrl(repoUrl!)) {
      await convex.mutation(api.repositories.updateRepositoryStatus, {
        id: repositoryId as Id<"repositories">,
        status: 'error',
        errorMessage: 'Invalid Git repository URL',
      });
      
      return NextResponse.json(
        { error: 'Invalid Git repository URL' },
        { status: 400 }
      );
    }

    // Create analysis session
    const sessionId = await convex.mutation(api.analysis_sessions.createAnalysisSession, {
      repositoryId: repositoryId as Id<"repositories">,
      totalCommits: 0, // Will be updated after cloning
    });

    // Start background cloning process
    cloneRepositoryBackground(repositoryId, repoUrl!, sessionId);

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Repository cloning started',
    });

  } catch (error) {
    console.error('Clone API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function isValidGitUrl(url: string): boolean {
  const gitUrlPatterns = [
    /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\.git$/,
    /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/,
    /^git@github\.com:[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\.git$/,
    /^https:\/\/gitlab\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\.git$/,
    /^https:\/\/gitlab\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/,
    /^https:\/\/bitbucket\.org\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\.git$/,
    /^https:\/\/bitbucket\.org\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/,
  ];
  
  return gitUrlPatterns.some(pattern => pattern.test(url));
}

async function cloneRepositoryBackground(
  repositoryId: string,
  repoUrl: string,
  sessionId: string
) {
  try {
    // Update status to running
    await convex.mutation(api.analysis_sessions.updateAnalysisSession, {
      sessionId: sessionId as Id<"analysis_sessions">,
      status: 'running',
      currentPhase: 'cloning',
    });

    await convex.mutation(api.repositories.updateRepositoryStatus, {
      id: repositoryId as Id<"repositories">,
      status: 'cloning',
    });

    // Create temporary directory
    const tempDir = path.join(tmpdir(), 'codebase-analysis', repositoryId);
    const repoDir = path.join(tempDir, 'repo');

    // Clean up any existing directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    mkdirSync(tempDir, { recursive: true });

    // Clone repository
    await execAsync(`git clone "${repoUrl}" "${repoDir}"`);

    // Update phase to parsing
    await convex.mutation(api.analysis_sessions.updateAnalysisSession, {
      sessionId: sessionId as Id<"analysis_sessions">,
      currentPhase: 'parsing',
    });

    // Get total commit count
    const { stdout: commitCountStr } = await execAsync(
      'git rev-list --count HEAD',
      { cwd: repoDir }
    );
    const totalCommits = parseInt(commitCountStr.trim(), 10);

    // Get total file count
    const { stdout: fileCountStr } = await execAsync(
      'find . -type f -not -path "./.git/*" | wc -l',
      { cwd: repoDir }
    );
    const totalFiles = parseInt(fileCountStr.trim(), 10);

    // Detect primary language
    const { stdout: languagesStr } = await execAsync(
      'find . -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" -o -name "*.go" -o -name "*.rs" -o -name "*.cpp" -o -name "*.c" | head -20',
      { cwd: repoDir }
    );
    const primaryLanguage = detectPrimaryLanguage(languagesStr);

    // Update session with total commits
    await convex.mutation(api.analysis_sessions.updateAnalysisSession, {
      sessionId: sessionId as Id<"analysis_sessions">,
      commitsProcessed: 0,
    });

    // Update repository with file stats
    await convex.mutation(api.repositories.updateRepositoryStatus, {
      id: repositoryId as Id<"repositories">,
      status: 'analyzing',
      totalCommits,
      totalFiles,
      primaryLanguage,
    });

    // Parse git history (simplified for hackathon)
    await parseGitHistory(repositoryId, repoDir, sessionId, totalCommits);

    // Complete analysis session
    await convex.mutation(api.analysis_sessions.completeAnalysisSession, {
      sessionId: sessionId as Id<"analysis_sessions">,
      success: true,
    });

    // Update repository status to ready
    await convex.mutation(api.repositories.updateRepositoryStatus, {
      id: repositoryId as Id<"repositories">,
      status: 'ready',
    });

    // Clean up temporary directory
    rmSync(tempDir, { recursive: true, force: true });

  } catch (error) {
    console.error('Background cloning error:', error);

    // Log error and update status
    await convex.mutation(api.analysis_sessions.addAnalysisError, {
      sessionId: sessionId as Id<"analysis_sessions">,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    await convex.mutation(api.analysis_sessions.completeAnalysisSession, {
      sessionId: sessionId as Id<"analysis_sessions">,
      success: false,
      finalError: error instanceof Error ? error.message : 'Unknown error',
    });

    await convex.mutation(api.repositories.updateRepositoryStatus, {
      id: repositoryId as Id<"repositories">,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function detectPrimaryLanguage(fileList: string): string | undefined {
  const extensions = fileList.split('\n').map(file => {
    const ext = path.extname(file).toLowerCase();
    return ext;
  });

  const counts: Record<string, number> = {};
  extensions.forEach(ext => {
    if (ext) {
      counts[ext] = (counts[ext] || 0) + 1;
    }
  });

  const sortedExts = Object.entries(counts).sort(([,a], [,b]) => b - a);
  const topExt = sortedExts[0]?.[0];

  const langMap: Record<string, string> = {
    '.js': 'JavaScript',
    '.ts': 'TypeScript',
    '.py': 'Python',
    '.java': 'Java',
    '.go': 'Go',
    '.rs': 'Rust',
    '.cpp': 'C++',
    '.c': 'C',
    '.rb': 'Ruby',
    '.php': 'PHP',
  };

  return topExt ? langMap[topExt] : undefined;
}

async function parseGitHistory(
  repositoryId: string,
  repoDir: string,
  sessionId: string,
  totalCommits: number
) {
  try {
    // Get git log (limited to recent commits for hackathon performance)
    const maxCommits = Math.min(totalCommits, 100);
    const { stdout } = await execAsync(
      `git log --pretty=format:"%H|%an|%ae|%at|%s" -n ${maxCommits}`,
      { cwd: repoDir }
    );

    const commits = stdout.split('\n').filter(line => line.trim());
    let processed = 0;

    for (const commitLine of commits) {
      const [sha, author, authorEmail, timestamp, message] = commitLine.split('|');
      
      // Get files changed in this commit
      try {
        const { stdout: filesOutput } = await execAsync(
          `git show --name-only --format="" ${sha}`,
          { cwd: repoDir }
        );
        const filesChanged = filesOutput.split('\n').filter(f => f.trim());

        // Get diff stats
        const { stdout: statsOutput } = await execAsync(
          `git show --stat --format="" ${sha}`,
          { cwd: repoDir }
        );
        const stats = parseDiffStats(statsOutput);

        // Save commit to database
        await convex.mutation(api.commits.insertCommit, {
          repositoryId: repositoryId as Id<"repositories">,
          sha,
          message: message || '',
          author: author || '',
          authorEmail: authorEmail || '',
          date: parseInt(timestamp) * 1000,
          filesChanged,
          linesAdded: stats.added,
          linesDeleted: stats.deleted,
          tags: [], // Will be filled by AI analysis later
        });

        processed++;

        // Update progress every 10 commits
        if (processed % 10 === 0) {
          await convex.mutation(api.analysis_sessions.updateAnalysisSession, {
            sessionId: sessionId as Id<"analysis_sessions">,
            commitsProcessed: processed,
          });
        }
      } catch (commitError) {
        console.error(`Error processing commit ${sha}:`, commitError);
        await convex.mutation(api.analysis_sessions.addAnalysisError, {
          sessionId: sessionId as Id<"analysis_sessions">,
          errorMessage: `Failed to process commit ${sha}: ${commitError}`,
        });
      }
    }

    // Final progress update
    await convex.mutation(api.analysis_sessions.updateAnalysisSession, {
      sessionId: sessionId as Id<"analysis_sessions">,
      commitsProcessed: processed,
      currentPhase: 'indexing',
    });

  } catch (error) {
    throw new Error(`Failed to parse git history: ${error}`);
  }
}

function parseDiffStats(statsOutput: string): { added: number; deleted: number } {
  const lines = statsOutput.split('\n');
  const summaryLine = lines.find(line => line.includes('insertion') || line.includes('deletion'));
  
  if (!summaryLine) {
    return { added: 0, deleted: 0 };
  }

  const insertMatch = summaryLine.match(/(\d+) insertion/);
  const deleteMatch = summaryLine.match(/(\d+) deletion/);

  return {
    added: insertMatch ? parseInt(insertMatch[1], 10) : 0,
    deleted: deleteMatch ? parseInt(deleteMatch[1], 10) : 0,
  };
}

