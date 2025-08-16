import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Rate limiting configuration
const RATE_LIMIT_DELAY_MS = 1000; // 1 second between requests
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds

// Claude API configuration
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-3-haiku-20240307";
const MAX_TOKENS = 1024;

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Utility function for delay
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Utility function for Claude API calls with retry logic
async function callClaudeAPI(
  messages: ClaudeMessage[],
  system?: string,
  retries = MAX_RETRIES
): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error("CLAUDE_API_KEY environment variable is not set");
  }

  const requestBody = {
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    messages,
    ...(system && { system }),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await delay(RATE_LIMIT_DELAY_MS);

      const response = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Claude API error (${response.status}):`, errorText);
        
        // Rate limit error - wait longer
        if (response.status === 429) {
          if (attempt < retries) {
            await delay(RETRY_DELAY_MS * (attempt + 1));
            continue;
          }
        }
        
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      const data: ClaudeResponse = await response.json();
      
      if (data.content && data.content.length > 0) {
        return data.content[0].text;
      }
      
      throw new Error("No content in Claude API response");
      
    } catch (error) {
      console.error(`Claude API attempt ${attempt + 1} failed:`, error);
      
      if (attempt === retries) {
        throw error;
      }
      
      await delay(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  
  throw new Error("Max retries exceeded");
}

export const analyzeCommitWithAI = action({
  args: {
    commitId: v.id("commits"),
    diff: v.string(),
    commitMessage: v.string(),
    filesChanged: v.array(v.string()),
  },
  handler: async (ctx, { commitId, diff, commitMessage, filesChanged }) => {
    const startTime = Date.now();
    
    try {
      // Get commit details
      const commit = await ctx.runQuery(api.commits.getCommitById, { id: commitId });
      if (!commit) {
        throw new Error("Commit not found");
      }

      // Build context for AI analysis
      const filesList = filesChanged.slice(0, 20).join(", "); // Limit to first 20 files
      const diffPreview = diff.length > 4000 ? diff.substring(0, 4000) + "..." : diff;

      const system = `You are an expert code analyst. Analyze the given Git commit and provide insights in the following JSON format:
{
  "summary": "Brief technical summary of changes (1-2 sentences)",
  "tags": ["tag1", "tag2", "tag3"],
  "businessImpact": "Business impact description (optional)",
  "complexityScore": 1-10
}

Guidelines:
- Summary should be technical but accessible
- Tags should be relevant categories (e.g., "bugfix", "feature", "refactor", "ui", "api", "security")
- Business impact should explain user/business value if applicable
- Complexity score: 1=trivial, 5=moderate, 10=very complex
- Keep response concise and actionable`;

      const userMessage = `Analyze this commit:

**Commit Message:** ${commitMessage}

**Files Changed:** ${filesList}

**Diff Preview:**
\`\`\`
${diffPreview}
\`\`\`

Provide analysis in the specified JSON format.`;

      // Call Claude API
      const response = await callClaudeAPI(
        [{ role: "user", content: userMessage }],
        system
      );

      // Parse AI response
      let analysis;
      try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", response);
        // Fallback analysis
        analysis = {
          summary: "AI analysis failed - manual review needed",
          tags: ["analysis-failed"],
          businessImpact: null,
          complexityScore: 5,
        };
      }

      // Update commit with AI analysis
      await ctx.runMutation(api.commits.updateCommitAnalysis, {
        commitId,
        aiSummary: analysis.summary,
        tags: analysis.tags || [],
        businessImpact: analysis.businessImpact || undefined,
        complexityScore: analysis.complexityScore || undefined,
      });

      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        analysis,
        processingTime,
      };

    } catch (error) {
      console.error("AI analysis failed:", error);
      
      // Store error state
      await ctx.runMutation(api.commits.updateCommitAnalysis, {
        commitId,
        aiSummary: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tags: ["analysis-error"],
        businessImpact: undefined,
        complexityScore: undefined,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        processingTime: Date.now() - startTime,
      };
    }
  },
});

export const askQuestion = action({
  args: {
    repositoryId: v.id("repositories"),
    query: v.string(),
    contextCommits: v.optional(v.array(v.id("commits"))),
    contextFiles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { repositoryId, query, contextCommits = [], contextFiles = [] }) => {
    const startTime = Date.now();
    
    try {
      // Get repository info
      const repository = await ctx.runQuery(api.repositories.getRepository, { id: repositoryId });
      if (!repository) {
        throw new Error("Repository not found");
      }

      // Get relevant commits if not provided
      let relevantCommits = contextCommits;
      if (relevantCommits.length === 0) {
        const recentCommits = await ctx.runQuery(api.commits.getCommits, {
          repositoryId,
          limit: 10,
        });
        relevantCommits = recentCommits.page.map((commit: any) => commit._id);
      }

      // Build context from commits
      const commitDetails: any[] = await Promise.all(
        relevantCommits.slice(0, 5).map(async (commitId): Promise<any> => {
          const commit: any = await ctx.runQuery(api.commits.getCommitById, { id: commitId });
          if (commit) {
            return {
              message: commit.message,
              author: commit.author,
              date: new Date(commit.date).toISOString().split('T')[0],
              summary: commit.aiSummary || "No summary available",
              files: commit.filesChanged.slice(0, 5),
            };
          }
          return null;
        })
      );

      const validCommitDetails: any[] = commitDetails.filter(Boolean);

      // Build context for AI
      const system = `You are an expert code analyst helping users understand a Git repository: ${repository.name} by ${repository.owner}.

Your task is to answer questions about the codebase based on commit history and file changes. Provide accurate, helpful responses based on the available context.

Guidelines:
- Be specific and reference actual commits/changes when relevant
- If you don't have enough context, say so clearly
- Focus on technical accuracy over speculation
- Provide actionable insights when possible`;

      const contextString = validCommitDetails.length > 0 
        ? `Recent commits context:
${validCommitDetails.map((commit: any, i: number) => 
  `${i + 1}. ${commit?.message} (${commit?.author}, ${commit?.date})
   Summary: ${commit?.summary}
   Files: ${commit?.files.join(", ")}`
).join("\n\n")}`
        : "No recent commit context available.";

      const filesContext = contextFiles.length > 0 
        ? `\nRelevant files: ${contextFiles.join(", ")}`
        : "";

      const userMessage = `Repository: ${repository.name}
Question: ${query}

${contextString}${filesContext}

Please provide a helpful answer based on this context.`;

      // Call Claude API
      const response = await callClaudeAPI(
        [{ role: "user", content: userMessage }],
        system
      );

      // Calculate confidence based on context quality
      const confidence = Math.min(0.9, 0.3 + (validCommitDetails.length * 0.1) + (contextFiles.length * 0.05));

      // Store Q&A interaction
      const questionId: any = await ctx.runMutation(api.commits.createQuestion, {
        repositoryId,
        query,
        response,
        relevantCommits,
        relevantFiles: contextFiles,
        processingTime: Date.now() - startTime,
        confidence: Math.round(confidence * 100) / 100,
      });

      return {
        success: true,
        response,
        confidence,
        processingTime: Date.now() - startTime,
        questionId,
        contextsUsed: {
          commits: validCommitDetails.length,
          files: contextFiles.length,
        },
      };

    } catch (error) {
      console.error("Question processing failed:", error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        response: "I'm sorry, I encountered an error while processing your question. Please try again.",
        confidence: 0,
        processingTime: Date.now() - startTime,
        contextsUsed: {
          commits: 0,
          files: 0,
        },
      };
    }
  },
});

// Background job for batch commit analysis
export const analyzeBatchCommits = action({
  args: {
    repositoryId: v.id("repositories"),
    commitIds: v.array(v.id("commits")),
    sessionId: v.optional(v.id("analysis_sessions")),
  },
  handler: async (ctx, { repositoryId, commitIds, sessionId }) => {
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < commitIds.length; i++) {
      const commitId = commitIds[i];
      
      try {
        // Note: In a real implementation, you'd need to get the diff from git
        // This is a placeholder - actual diff would come from git commands
        const result: any = await ctx.runAction(api.ai.analyzeCommitWithAI, {
          commitId,
          diff: "// Diff would be provided by git integration",
          commitMessage: "Commit message would be retrieved",
          filesChanged: [],
        });

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }

        results.push(result);

        // Update session progress if provided
        if (sessionId) {
          await ctx.runMutation(api.analysis_sessions.updateProgress, {
            sessionId,
            commitsProcessed: i + 1,
            currentPhase: "ai_analysis",
          });
        }

        // Rate limiting between requests
        if (i < commitIds.length - 1) {
          await delay(RATE_LIMIT_DELAY_MS);
        }

      } catch (error) {
        failureCount++;
        results.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          processingTime: 0,
        });
      }
    }

    return {
      totalProcessed: commitIds.length,
      successCount,
      failureCount,
      results: results.slice(0, 10), // Return first 10 results for feedback
    };
  },
});