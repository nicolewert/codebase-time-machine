import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ContextRequest {
  repositoryId: string;
  question: string;
  threadId?: string;
  maxCommits?: number;
  maxFiles?: number;
}

interface ContextSource {
  type: 'commit' | 'file' | 'diff';
  reference: string;
  relevanceScore: number;
  content?: string;
  metadata?: any;
}

// Simple text similarity scoring based on keywords
function calculateRelevanceScore(text: string, question: string): number {
  const questionWords = question.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const textWords = text.toLowerCase().split(/\s+/);
  
  let matches = 0;
  let totalWords = questionWords.length;
  
  for (const qWord of questionWords) {
    if (textWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
      matches++;
    }
  }
  
  return totalWords > 0 ? matches / totalWords : 0;
}

// Analyze and score commits for relevance
async function analyzeCommitRelevance(
  repositoryId: string, 
  question: string, 
  maxCommits: number
): Promise<ContextSource[]> {
  try {
    // Get recent commits
    const commitsResult = await convex.query(api.commits.getCommits, {
      repositoryId: repositoryId as Id<"repositories">,
      limit: Math.min(maxCommits * 2, 50), // Get more to filter from
    });

    const commits = commitsResult.page || [];
    
    // Score commits based on relevance to question
    const scoredCommits = commits.map((commit: any) => {
      let relevanceScore = 0;
      
      // Score based on commit message
      relevanceScore += calculateRelevanceScore(commit.message, question) * 0.4;
      
      // Score based on AI summary if available
      if (commit.aiSummary) {
        relevanceScore += calculateRelevanceScore(commit.aiSummary, question) * 0.3;
      }
      
      // Score based on files changed
      const filesText = commit.filesChanged.join(' ');
      relevanceScore += calculateRelevanceScore(filesText, question) * 0.2;
      
      // Boost score for recent commits
      const daysSince = (Date.now() - commit.date) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 1 - (daysSince / 30)) * 0.1; // Boost for commits within 30 days
      relevanceScore += recencyBoost;
      
      return {
        type: 'commit' as const,
        reference: `${commit.sha.substring(0, 8)} - ${commit.message}`,
        relevanceScore: Math.min(1, relevanceScore),
        content: commit.aiSummary || commit.message,
        metadata: {
          sha: commit.sha,
          author: commit.author,
          date: commit.date,
          filesChanged: commit.filesChanged.slice(0, 5), // Limit to first 5 files
          tags: commit.tags || [],
          complexityScore: commit.complexityScore
        }
      };
    });
    
    // Sort by relevance and take top results
    return scoredCommits
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxCommits)
      .filter(commit => commit.relevanceScore > 0.1); // Filter out very low relevance
      
  } catch (error) {
    console.error('Error analyzing commit relevance:', error);
    return [];
  }
}

// Analyze and score files for relevance
async function analyzeFileRelevance(
  repositoryId: string, 
  question: string, 
  maxFiles: number
): Promise<ContextSource[]> {
  try {
    // Get files from the repository
    const files = await convex.query(api.files.getFiles, {
      repositoryId: repositoryId as Id<"repositories">,
      limit: Math.min(maxFiles * 2, 100),
    });

    // Score files based on relevance to question
    const scoredFiles = files.map((file: any) => {
      let relevanceScore = 0;
      
      // Score based on file path/name
      relevanceScore += calculateRelevanceScore(file.path, question) * 0.5;
      
      // Score based on file extension matching question context
      const questionLower = question.toLowerCase();
      const extension = file.extension?.toLowerCase() || '';
      
      // Boost for specific technology mentions
      const techBoosts: { [key: string]: string[] } = {
        '.ts': ['typescript', 'ts', 'type'],
        '.tsx': ['react', 'tsx', 'component', 'ui'],
        '.js': ['javascript', 'js'],
        '.jsx': ['react', 'jsx', 'component'],
        '.css': ['style', 'css', 'design'],
        '.py': ['python', 'py'],
        '.java': ['java'],
        '.go': ['golang', 'go'],
        '.rs': ['rust'],
        '.cpp': ['c++', 'cpp'],
        '.sql': ['database', 'sql', 'query'],
      };
      
      const boostTerms = techBoosts[extension] || [];
      for (const term of boostTerms) {
        if (questionLower.includes(term)) {
          relevanceScore += 0.2;
          break;
        }
      }
      
      // Boost for high-complexity files if question seems technical
      if (file.maxComplexity > 7 && (questionLower.includes('complex') || questionLower.includes('difficult'))) {
        relevanceScore += 0.1;
      }
      
      // Boost for frequently changed files
      if (file.totalChanges > 10) {
        relevanceScore += 0.1;
      }
      
      return {
        type: 'file' as const,
        reference: file.path,
        relevanceScore: Math.min(1, relevanceScore),
        content: `File: ${file.path} (${file.language || 'unknown'})`,
        metadata: {
          extension: file.extension,
          language: file.language,
          totalChanges: file.totalChanges,
          maxComplexity: file.maxComplexity,
          primaryAuthors: file.primaryAuthors?.slice(0, 3) || [],
        }
      };
    });
    
    // Sort by relevance and take top results
    return scoredFiles
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxFiles)
      .filter(file => file.relevanceScore > 0.1);
      
  } catch (error) {
    console.error('Error analyzing file relevance:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ContextRequest = await request.json();
    const { 
      repositoryId, 
      question, 
      threadId, 
      maxCommits = 5, 
      maxFiles = 3 
    } = body;

    if (!repositoryId || !question) {
      return NextResponse.json(
        { error: 'Missing required fields: repositoryId, question' },
        { status: 400 }
      );
    }

    // Validate repository exists
    try {
      const repository = await convex.query(api.repositories.getRepository, {
        id: repositoryId as Id<"repositories">
      });
      
      if (!repository) {
        return NextResponse.json(
          { error: 'Repository not found' },
          { status: 404 }
        );
      }
    } catch (error) {
      // If the ID format is invalid, return an error
      return NextResponse.json(
        { 
          error: 'Invalid repository ID format',
          contextSources: [],
          contextQuality: {
            totalSources: 0,
            averageRelevance: 0,
            hasConversationHistory: false,
            commitSourcesCount: 0,
            fileSourcesCount: 0,
          }
        },
        { status: 400 }
      );
    }

    // Get conversation history if threadId provided
    let conversationContext: ContextSource[] = [];
    if (threadId) {
      try {
        const messages = await convex.query(api.conversations.getThreadMessages, {
          threadId,
          limit: 10,
        });
        
        conversationContext = messages.slice(0, 3).map((msg: any, index: number) => ({
          type: 'diff' as const, // Using 'diff' type for conversation context
          reference: `Previous ${msg.messageType}: ${msg.query || msg.response}`.slice(0, 100) + '...',
          relevanceScore: Math.max(0.3, 0.8 - (index * 0.1)),
          content: msg.query || msg.response,
          metadata: {
            messageType: msg.messageType,
            confidence: msg.confidence,
            createdAt: msg.createdAt,
          }
        }));
      } catch (error) {
        console.error('Error loading conversation context:', error);
      }
    }

    // Analyze commits and files in parallel
    const [commitSources, fileSources] = await Promise.all([
      analyzeCommitRelevance(repositoryId, question, maxCommits),
      analyzeFileRelevance(repositoryId, question, maxFiles),
    ]);

    // Combine all context sources
    const allSources = [
      ...conversationContext,
      ...commitSources,
      ...fileSources,
    ];

    // Sort by relevance score
    allSources.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Calculate overall context quality
    const avgRelevance = allSources.length > 0 
      ? allSources.reduce((sum, source) => sum + source.relevanceScore, 0) / allSources.length
      : 0;

    const contextQuality = {
      totalSources: allSources.length,
      averageRelevance: Math.round(avgRelevance * 100) / 100,
      hasConversationHistory: conversationContext.length > 0,
      commitSourcesCount: commitSources.length,
      fileSourcesCount: fileSources.length,
    };

    return NextResponse.json({
      success: true,
      contextSources: allSources,
      contextQuality,
      recommendedSources: allSources.slice(0, 8), // Top 8 most relevant
    });

  } catch (error) {
    console.error('Context builder error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        contextSources: [],
        contextQuality: {
          totalSources: 0,
          averageRelevance: 0,
          hasConversationHistory: false,
          commitSourcesCount: 0,
          fileSourcesCount: 0,
        }
      },
      { status: 500 }
    );
  }
}