import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Queries
export const getFiles = query({
  args: { 
    repositoryId: v.id("repositories"),
    sortBy: v.optional(v.union(v.literal("complexity"), v.literal("changes"), v.literal("name"), v.literal("size"))),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    extension: v.optional(v.string()),
    isDeleted: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { repositoryId, sortBy = "name", sortOrder = "asc", extension, isDeleted, limit = 100 }) => {
    let query = ctx.db
      .query("files")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId));

    if (extension) {
      query = query.filter(q => q.eq(q.field("extension"), extension));
    }

    if (isDeleted !== undefined) {
      query = query.filter(q => q.eq(q.field("isDeleted"), isDeleted));
    }

    const files = await query.collect();
    
    // Sort in memory for complex sorting options
    files.sort((a, b) => {
      let compareValue = 0;
      switch (sortBy) {
        case "complexity":
          compareValue = a.maxComplexity - b.maxComplexity;
          break;
        case "changes":
          compareValue = a.totalChanges - b.totalChanges;
          break;
        case "size":
          compareValue = a.currentSize - b.currentSize;
          break;
        case "name":
        default:
          compareValue = a.path.localeCompare(b.path);
          break;
      }
      return sortOrder === "desc" ? -compareValue : compareValue;
    });

    return files.slice(0, limit);
  },
});

export const getFileById = query({
  args: { id: v.id("files") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getFileByPath = query({
  args: { repositoryId: v.id("repositories"), path: v.string() },
  handler: async (ctx, { repositoryId, path }) => {
    return await ctx.db
      .query("files")
      .filter(q => q.and(
        q.eq(q.field("repositoryId"), repositoryId),
        q.eq(q.field("path"), path)
      ))
      .first();
  },
});

export const getFilesByExtension = query({
  args: { repositoryId: v.id("repositories"), extension: v.string() },
  handler: async (ctx, { repositoryId, extension }) => {
    return await ctx.db
      .query("files")
      .filter(q => q.and(
        q.eq(q.field("repositoryId"), repositoryId),
        q.eq(q.field("extension"), extension)
      ))
      .collect();
  },
});

export const getTopComplexityFiles = query({
  args: { repositoryId: v.id("repositories"), limit: v.optional(v.number()) },
  handler: async (ctx, { repositoryId, limit = 10 }) => {
    const files = await ctx.db
      .query("files")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .collect();
    
    return files
      .sort((a, b) => b.maxComplexity - a.maxComplexity)
      .slice(0, limit);
  },
});

// Mutations
export const insertFile = mutation({
  args: {
    repositoryId: v.id("repositories"),
    path: v.string(),
    extension: v.string(),
    firstSeen: v.number(),
    lastModified: v.number(),
    totalChanges: v.number(),
    currentSize: v.number(),
    maxComplexity: v.number(),
    avgComplexity: v.number(),
    primaryAuthors: v.array(v.string()),
    isDeleted: v.boolean(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("files", args);
  },
});

export const insertFiles = mutation({
  args: { 
    files: v.array(v.object({
      repositoryId: v.id("repositories"),
      path: v.string(),
      extension: v.string(),
      firstSeen: v.number(),
      lastModified: v.number(),
      totalChanges: v.number(),
      currentSize: v.number(),
      maxComplexity: v.number(),
      avgComplexity: v.number(),
      primaryAuthors: v.array(v.string()),
      isDeleted: v.boolean(),
      language: v.optional(v.string()),
    }))
  },
  handler: async (ctx, { files }) => {
    const results = [];
    
    for (const file of files) {
      // Check if file already exists
      const existing = await ctx.db
        .query("files")
        .filter(q => q.and(
          q.eq(q.field("repositoryId"), file.repositoryId),
          q.eq(q.field("path"), file.path)
        ))
        .first();

      if (existing) {
        // Update existing file with conflict resolution
        const updated = await ctx.db.patch(existing._id, {
          lastModified: Math.max(existing.lastModified, file.lastModified),
          totalChanges: existing.totalChanges + file.totalChanges,
          currentSize: file.currentSize,
          maxComplexity: Math.max(existing.maxComplexity, file.maxComplexity),
          avgComplexity: (existing.avgComplexity + file.avgComplexity) / 2,
          primaryAuthors: [...new Set([...existing.primaryAuthors, ...file.primaryAuthors])],
          isDeleted: file.isDeleted,
          language: file.language || existing.language,
        });
        results.push(updated);
      } else {
        // Insert new file
        const inserted = await ctx.db.insert("files", file);
        results.push(inserted);
      }
    }
    
    return results;
  },
});

export const updateFileAnalysis = mutation({
  args: {
    fileId: v.id("files"),
    maxComplexity: v.optional(v.number()),
    avgComplexity: v.optional(v.number()),
    language: v.optional(v.string()),
    currentSize: v.optional(v.number()),
  },
  handler: async (ctx, { fileId, maxComplexity, avgComplexity, language, currentSize }) => {
    const updateData: any = {};
    if (maxComplexity !== undefined) updateData.maxComplexity = maxComplexity;
    if (avgComplexity !== undefined) updateData.avgComplexity = avgComplexity;
    if (language !== undefined) updateData.language = language;
    if (currentSize !== undefined) updateData.currentSize = currentSize;

    return await ctx.db.patch(fileId, updateData);
  },
});

export const markFileAsDeleted = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    return await ctx.db.patch(fileId, { isDeleted: true });
  },
});

export const deleteFilesByRepository = mutation({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    const files = await ctx.db
      .query("files")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .collect();
    
    await Promise.all(files.map(file => ctx.db.delete(file._id)));
    return files.length;
  },
});