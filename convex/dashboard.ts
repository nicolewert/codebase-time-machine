import { v } from "convex/values";
import { query } from "./_generated/server";

// Dashboard data types for Recharts compatibility
const DashboardChartDataSchema = v.object({
  date: v.number(),
  commits: v.optional(v.number()),
  linesAdded: v.optional(v.number()),
  linesDeleted: v.optional(v.number()),
  complexityScore: v.optional(v.number()),
});

const ContributorDataSchema = v.object({
  author: v.string(),
  commitCount: v.number(),
  linesAdded: v.number(),
  linesDeleted: v.number(),
  fileCount: v.number(),
  topFiles: v.array(v.string()),
});

const RepositoryHealthSchema = v.object({
  totalCommits: v.number(),
  uniqueAuthors: v.number(),
  filesChanged: v.number(),
  averageComplexity: v.number(),
  mostComplexFile: v.string(),
});

export const getDashboardData = query({
  args: { 
    repositoryId: v.id("repositories"),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, { repositoryId, dateFrom, dateTo }) => {
    // Base query for filtering commits
    let commitsQuery = ctx.db
      .query("commits")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId));

    // Apply date filters if provided
    if (dateFrom) {
      commitsQuery = commitsQuery.filter(q => q.gte(q.field("date"), dateFrom));
    }
    if (dateTo) {
      commitsQuery = commitsQuery.filter(q => q.lte(q.field("date"), dateTo));
    }

    // Fetch filtered commits
    const commits = await commitsQuery.collect();

    // Get unique authors
    const uniqueAuthors = new Set(commits.map(commit => commit.author));

    // Calculate repository health metrics with defensive programming
    const totalComplexityScore = commits
      .map(commit => commit.complexityScore || 0)
      .reduce((a, b) => a + b, 0);
    
    const averageComplexity = commits.length > 0 
      ? totalComplexityScore / commits.length 
      : 0;
    
    const sortedCommitsByComplexity = commits
      .filter(commit => commit.complexityScore && commit.filesChanged && commit.filesChanged.length > 0)
      .sort((a, b) => (b.complexityScore || 0) - (a.complexityScore || 0));
    
    const repositoryHealth = {
      totalCommits: commits.length,
      uniqueAuthors: uniqueAuthors.size,
      filesChanged: new Set(commits.flatMap(commit => commit.filesChanged || [])).size,
      averageComplexity,
      mostComplexFile: sortedCommitsByComplexity.length > 0 
        ? sortedCommitsByComplexity[0].filesChanged[0] 
        : "N/A",
    };

    // Prepare time series data for charts with consistent date handling
    const timeSeriesData = commits.reduce((acc, commit) => {
      // Ensure commit.date is valid
      if (!commit.date || isNaN(commit.date)) {
        return acc;
      }
      
      const commitDate = new Date(commit.date);
      if (isNaN(commitDate.getTime())) {
        return acc;
      }
      
      const dateKey = commitDate.toISOString().split('T')[0];
      const existingEntry = acc.find(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.toISOString().split('T')[0] === dateKey;
      });

      if (existingEntry) {
        existingEntry.commits = (existingEntry.commits || 0) + 1;
        existingEntry.linesAdded = (existingEntry.linesAdded || 0) + (commit.linesAdded || 0);
        existingEntry.linesDeleted = (existingEntry.linesDeleted || 0) + (commit.linesDeleted || 0);
        
        // Safe average complexity calculation
        const currentComplexity = existingEntry.complexityScore || 0;
        const newComplexity = commit.complexityScore || 0;
        existingEntry.complexityScore = (currentComplexity + newComplexity) / 2;
      } else {
        acc.push({
          date: commit.date,
          commits: 1,
          linesAdded: commit.linesAdded || 0,
          linesDeleted: commit.linesDeleted || 0,
          complexityScore: commit.complexityScore || 0,
        });
      }
      return acc;
    }, [] as Array<{
      date: number;
      commits?: number;
      linesAdded?: number;
      linesDeleted?: number;
      complexityScore?: number;
    }>);

    return {
      repositoryHealth,
      timeSeriesData,
    };
  },
});

export const getComplexityTrends = query({
  args: { 
    repositoryId: v.id("repositories"),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, { repositoryId, dateFrom, dateTo }) => {
    let filesQuery = ctx.db
      .query("files")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId));

    // Get complexity distribution for files
    const fileComplexityDistribution = await filesQuery
      .filter(q => q.gt(q.field("maxComplexity"), 0))
      .order("desc")
      .take(100);

    // Complexity trends from commits
    let commitsQuery = ctx.db
      .query("commits")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId));

    if (dateFrom) {
      commitsQuery = commitsQuery.filter(q => q.gte(q.field("date"), dateFrom));
    }
    if (dateTo) {
      commitsQuery = commitsQuery.filter(q => q.lte(q.field("date"), dateTo));
    }

    const commits = await commitsQuery.collect();

    // Time series of complexity scores with validation
    const complexityTrends = commits
      .filter(commit => 
        commit.complexityScore !== undefined && 
        commit.complexityScore !== null &&
        commit.date &&
        !isNaN(commit.date)
      )
      .map(commit => ({
        date: commit.date,
        complexityScore: commit.complexityScore || 0,
      }))
      .sort((a, b) => (a.date || 0) - (b.date || 0));

    return {
      fileComplexityDistribution,
      complexityTrends,
    };
  },
});

export const getOwnershipData = query({
  args: { 
    repositoryId: v.id("repositories"),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, { repositoryId, dateFrom, dateTo }) => {
    let commitsQuery = ctx.db
      .query("commits")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId));

    if (dateFrom) {
      commitsQuery = commitsQuery.filter(q => q.gte(q.field("date"), dateFrom));
    }
    if (dateTo) {
      commitsQuery = commitsQuery.filter(q => q.lte(q.field("date"), dateTo));
    }

    const commits = await commitsQuery.collect();

    // Calculate contributor statistics with safe data access
    const contributorStats = commits.reduce((acc, commit) => {
      // Skip commits without author or essential data
      if (!commit.author || !commit.filesChanged) {
        return acc;
      }
      
      const existingAuthor = acc.find(author => author.author === commit.author);
      
      if (existingAuthor) {
        existingAuthor.commitCount++;
        existingAuthor.linesAdded += commit.linesAdded || 0;
        existingAuthor.linesDeleted += commit.linesDeleted || 0;
        
        // Track unique files modified by author - safely handle arrays
        const safeFilesChanged = Array.isArray(commit.filesChanged) ? commit.filesChanged : [];
        safeFilesChanged.forEach(file => {
          if (file && typeof file === 'string' && !existingAuthor.topFiles.includes(file)) {
            existingAuthor.topFiles.push(file);
          }
        });
        existingAuthor.fileCount = existingAuthor.topFiles.length;
      } else {
        const safeFilesChanged = Array.isArray(commit.filesChanged) ? commit.filesChanged : [];
        acc.push({
          author: commit.author,
          commitCount: 1,
          linesAdded: commit.linesAdded || 0,
          linesDeleted: commit.linesDeleted || 0,
          fileCount: safeFilesChanged.length,
          topFiles: safeFilesChanged.filter(file => file && typeof file === 'string'),
        });
      }
      
      return acc;
    }, [] as Array<{
      author: string;
      commitCount: number;
      linesAdded: number;
      linesDeleted: number;
      fileCount: number;
      topFiles: string[];
    }>)
    .sort((a, b) => b.commitCount - a.commitCount);

    return contributorStats;
  },
});

export const getRecentActivity = query({
  args: { 
    repositoryId: v.id("repositories"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { repositoryId, limit = 20 }) => {
    // Fetch recent commits
    const recentCommits = await ctx.db
      .query("commits")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .order("desc")
      .take(limit);

    // Fetch recent questions
    const recentQuestions = await ctx.db
      .query("questions")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .order("desc")
      .take(limit);

    // Fetch latest analysis session
    const latestAnalysisSession = await ctx.db
      .query("analysis_sessions")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .order("desc")
      .first();

    return {
      recentCommits,
      recentQuestions,
      latestAnalysisSession,
    };
  },
});