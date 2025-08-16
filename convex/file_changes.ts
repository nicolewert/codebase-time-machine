import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Queries
export const getFileChanges = query({
  args: {
    fileId: v.optional(v.id("files")),
    commitId: v.optional(v.id("commits")),
    author: v.optional(v.string()),
    changeType: v.optional(v.union(
      v.literal("added"),
      v.literal("modified"),
      v.literal("deleted"),
      v.literal("renamed"),
      v.literal("copied")
    )),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { fileId, commitId, author, changeType, limit = 50, offset = 0 }) => {
    let baseQuery;
    if (fileId) {
      baseQuery = ctx.db.query("file_changes").withIndex("by_file", q => q.eq("fileId", fileId));
    } else if (commitId) {
      baseQuery = ctx.db.query("file_changes").withIndex("by_commit", q => q.eq("commitId", commitId));
    } else if (author) {
      baseQuery = ctx.db.query("file_changes").withIndex("by_author", q => q.eq("author", author));
    } else if (changeType) {
      baseQuery = ctx.db.query("file_changes").withIndex("by_change_type", q => q.eq("changeType", changeType));
    } else {
      baseQuery = ctx.db.query("file_changes");
    }

    const allChanges = await baseQuery.collect();
    
    let filteredChanges = allChanges;
    
    // Apply additional filters
    if (author && !baseQuery.toString().includes("by_author")) {
      filteredChanges = filteredChanges.filter(c => c.author === author);
    }
    if (changeType && !baseQuery.toString().includes("by_change_type")) {
      filteredChanges = filteredChanges.filter(c => c.changeType === changeType);
    }

    // Sort by timestamp descending
    filteredChanges.sort((a, b) => b.timestamp - a.timestamp);

    return {
      changes: filteredChanges.slice(offset, offset + limit),
      total: filteredChanges.length,
      hasMore: offset + limit < filteredChanges.length,
    };
  },
});

export const getChangesByTimeRange = query({
  args: {
    repositoryId: v.id("repositories"),
    startTime: v.number(),
    endTime: v.number(),
    fileId: v.optional(v.id("files")),
  },
  handler: async (ctx, { repositoryId, startTime, endTime, fileId }) => {
    let changes;
    
    if (fileId) {
      changes = await ctx.db
        .query("file_changes")
        .withIndex("by_file", q => q.eq("fileId", fileId))
        .collect();
    } else {
      changes = await ctx.db
        .query("file_changes")
        .withIndex("by_timestamp")
        .collect();
    }
    
    // Filter by time range and repository
    const filteredChanges = changes.filter(change => 
      change.timestamp >= startTime && 
      change.timestamp <= endTime
    );
    
    // If no fileId specified, filter by repository through file lookup
    if (!fileId) {
      const repositoryFiles = await ctx.db
        .query("files")
        .filter(q => q.eq(q.field("repositoryId"), repositoryId))
        .collect();
      
      const fileIds = new Set(repositoryFiles.map(f => f._id));
      return filteredChanges.filter(change => fileIds.has(change.fileId));
    }
    
    return filteredChanges;
  },
});

export const getChangeFrequencyStats = query({
  args: {
    repositoryId: v.id("repositories"),
    timeWindow: v.optional(v.number()), // days
  },
  handler: async (ctx, { repositoryId, timeWindow = 30 }) => {
    const endTime = Date.now();
    const startTime = endTime - (timeWindow * 24 * 60 * 60 * 1000);
    
    const repositoryFiles = await ctx.db
      .query("files")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .collect();
    
    const fileIds = new Set(repositoryFiles.map(f => f._id));
    
    const allChanges = await ctx.db
      .query("file_changes")
      .withIndex("by_timestamp")
      .collect();
    
    const recentChanges = allChanges.filter(change => 
      fileIds.has(change.fileId) &&
      change.timestamp >= startTime && 
      change.timestamp <= endTime
    );
    
    // Group by file
    const fileChangeStats = new Map();
    
    for (const change of recentChanges) {
      const file = repositoryFiles.find(f => f._id === change.fileId);
      if (!file) continue;
      
      if (!fileChangeStats.has(change.fileId)) {
        fileChangeStats.set(change.fileId, {
          fileId: change.fileId,
          filePath: file.path,
          fileName: file.name,
          changeCount: 0,
          authors: new Set(),
          changeTypes: new Map(),
          totalLines: 0,
          complexityDelta: 0,
        });
      }
      
      const stats = fileChangeStats.get(change.fileId);
      stats.changeCount += 1;
      stats.authors.add(change.author);
      stats.totalLines += change.linesChanged;
      stats.complexityDelta += change.complexityDelta;
      
      const changeType = change.changeType;
      stats.changeTypes.set(changeType, (stats.changeTypes.get(changeType) || 0) + 1);
    }
    
    // Convert to array and add frequency calculation
    const stats = Array.from(fileChangeStats.values()).map(stat => ({
      ...stat,
      authors: Array.from(stat.authors),
      changeTypes: Object.fromEntries(stat.changeTypes),
      changeFrequency: stat.changeCount / (timeWindow / 7), // changes per week
    }));
    
    stats.sort((a, b) => b.changeFrequency - a.changeFrequency);
    
    return {
      timeWindow,
      totalFiles: fileChangeStats.size,
      totalChanges: recentChanges.length,
      stats,
    };
  },
});

// Mutations
export const insertFileChange = mutation({
  args: {
    fileId: v.id("files"),
    commitId: v.id("commits"),
    changeType: v.union(
      v.literal("added"),
      v.literal("modified"),
      v.literal("deleted"),
      v.literal("renamed"),
      v.literal("copied")
    ),
    linesAdded: v.number(),
    linesDeleted: v.number(),
    linesChanged: v.number(),
    complexityDelta: v.number(),
    oldPath: v.optional(v.string()),
    newPath: v.optional(v.string()),
    timestamp: v.number(),
    author: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("file_changes", args);
  },
});

export const insertFileChanges = mutation({
  args: {
    changes: v.array(v.object({
      fileId: v.id("files"),
      commitId: v.id("commits"),
      changeType: v.union(
        v.literal("added"),
        v.literal("modified"),
        v.literal("deleted"),
        v.literal("renamed"),
        v.literal("copied")
      ),
      linesAdded: v.number(),
      linesDeleted: v.number(),
      linesChanged: v.number(),
      complexityDelta: v.number(),
      oldPath: v.optional(v.string()),
      newPath: v.optional(v.string()),
      timestamp: v.number(),
      author: v.string(),
    })),
  },
  handler: async (ctx, { changes }) => {
    const results = [];
    
    for (const change of changes) {
      // Check for duplicates
      const existing = await ctx.db
        .query("file_changes")
        .filter(q => q.and(
          q.eq(q.field("fileId"), change.fileId),
          q.eq(q.field("commitId"), change.commitId)
        ))
        .first();
      
      if (!existing) {
        const result = await ctx.db.insert("file_changes", change);
        results.push(result);
      }
    }
    
    return results;
  },
});

export const updateFileChangeComplexity = mutation({
  args: {
    changeId: v.id("file_changes"),
    complexityDelta: v.number(),
  },
  handler: async (ctx, { changeId, complexityDelta }) => {
    return await ctx.db.patch(changeId, { complexityDelta });
  },
});

export const deleteFileChangesByRepository = mutation({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    // Get all files for the repository
    const files = await ctx.db
      .query("files")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .collect();
    
    const fileIds = files.map(f => f._id);
    
    // Delete all file changes for these files
    let deletedCount = 0;
    for (const fileId of fileIds) {
      const changes = await ctx.db
        .query("file_changes")
        .withIndex("by_file", q => q.eq("fileId", fileId))
        .collect();
      
      await Promise.all(changes.map(change => ctx.db.delete(change._id)));
      deletedCount += changes.length;
    }
    
    return deletedCount;
  },
});