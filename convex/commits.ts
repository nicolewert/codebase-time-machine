import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Queries
export const getCommits = query({
  args: { 
    repositoryId: v.id("repositories"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { repositoryId, limit = 50, offset = 0 }) => {
    return await ctx.db
      .query("commits")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .order("desc")
      .paginate({ numItems: limit, cursor: null })
      .then(result => result.page);
  },
});

export const getCommitById = query({
  args: { id: v.id("commits") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getCommitBySha = query({
  args: { repositoryId: v.id("repositories"), sha: v.string() },
  handler: async (ctx, { repositoryId, sha }) => {
    return await ctx.db
      .query("commits")
      .filter(q => q.and(
        q.eq(q.field("repositoryId"), repositoryId),
        q.eq(q.field("sha"), sha)
      ))
      .first();
  },
});

export const getCommitsByAuthor = query({
  args: { repositoryId: v.id("repositories"), author: v.string() },
  handler: async (ctx, { repositoryId, author }) => {
    return await ctx.db
      .query("commits")
      .filter(q => q.and(
        q.eq(q.field("repositoryId"), repositoryId),
        q.eq(q.field("author"), author)
      ))
      .order("desc")
      .take(50);
  },
});

// Mutations
export const insertCommit = mutation({
  args: {
    repositoryId: v.id("repositories"),
    sha: v.string(),
    message: v.string(),
    author: v.string(),
    authorEmail: v.string(),
    date: v.number(),
    filesChanged: v.array(v.string()),
    linesAdded: v.number(),
    linesDeleted: v.number(),
    tags: v.array(v.string()),
    aiSummary: v.optional(v.string()),
    businessImpact: v.optional(v.string()),
    complexityScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("commits", args);
  },
});

export const insertCommits = mutation({
  args: { commits: v.array(v.any()) },
  handler: async (ctx, { commits }) => {
    const insertPromises = commits.map(commit => 
      ctx.db.insert("commits", commit)
    );
    return await Promise.all(insertPromises);
  },
});

export const updateCommitAnalysis = mutation({
  args: {
    commitId: v.id("commits"),
    aiSummary: v.string(),
    tags: v.array(v.string()),
    businessImpact: v.optional(v.string()),
    complexityScore: v.optional(v.number()),
  },
  handler: async (ctx, { commitId, aiSummary, tags, businessImpact, complexityScore }) => {
    return await ctx.db.patch(commitId, {
      aiSummary,
      tags,
      businessImpact,
      complexityScore,
    });
  },
});

export const deleteCommitsByRepository = mutation({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    const commits = await ctx.db
      .query("commits")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .collect();
    
    await Promise.all(commits.map(commit => ctx.db.delete(commit._id)));
    return commits.length;
  },
});