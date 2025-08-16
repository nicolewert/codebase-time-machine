import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Queries
export const getCommits = query({
  args: { 
    repositoryId: v.id("repositories"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    author: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, { repositoryId, limit = 50, cursor, author, dateFrom, dateTo }) => {
    let query = ctx.db
      .query("commits")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId));

    if (author) {
      query = query.filter(q => q.eq(q.field("author"), author));
    }

    if (dateFrom) {
      query = query.filter(q => q.gte(q.field("date"), dateFrom));
    }

    if (dateTo) {
      query = query.filter(q => q.lte(q.field("date"), dateTo));
    }

    return await query
      .order("desc")
      .paginate({ numItems: limit, cursor: cursor || null });
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

// Q&A related mutations
export const createQuestion = mutation({
  args: {
    repositoryId: v.id("repositories"),
    query: v.string(),
    response: v.string(),
    relevantCommits: v.array(v.id("commits")),
    relevantFiles: v.array(v.string()),
    processingTime: v.number(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("questions", {
      ...args,
      createdAt: Date.now(),
      upvotes: 0,
    });
  },
});

export const getQuestions = query({
  args: { 
    repositoryId: v.id("repositories"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { repositoryId, limit = 20 }) => {
    return await ctx.db
      .query("questions")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .order("desc")
      .take(limit);
  },
});

export const updateQuestionUpvotes = mutation({
  args: {
    questionId: v.id("questions"),
    increment: v.number(),
  },
  handler: async (ctx, { questionId, increment }) => {
    const question = await ctx.db.get(questionId);
    if (!question) {
      throw new Error("Question not found");
    }
    
    await ctx.db.patch(questionId, {
      upvotes: Math.max(0, question.upvotes + increment),
    });
  },
});