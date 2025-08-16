import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Queries
export const getAnalysisStatus = query({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    return await ctx.db
      .query("analysis_sessions")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .order("desc")
      .first();
  },
});

export const getAnalysisHistory = query({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    return await ctx.db
      .query("analysis_sessions")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .order("desc")
      .take(10);
  },
});

export const getAllAnalysisSessions = query({
  args: { status: v.optional(v.union(v.literal("pending"), v.literal("running"), v.literal("completed"), v.literal("failed"))) },
  handler: async (ctx, { status }) => {
    let query = ctx.db.query("analysis_sessions");
    
    if (status) {
      query = query.filter(q => q.eq(q.field("status"), status));
    }
    
    return await query.order("desc").take(50);
  },
});

// Mutations
export const createAnalysisSession = mutation({
  args: {
    repositoryId: v.id("repositories"),
    totalCommits: v.number(),
  },
  handler: async (ctx, { repositoryId, totalCommits }) => {
    return await ctx.db.insert("analysis_sessions", {
      repositoryId,
      startedAt: Date.now(),
      status: "pending",
      commitsProcessed: 0,
      totalCommits,
      currentPhase: "cloning",
      errorLogs: [],
    });
  },
});

export const updateAnalysisSession = mutation({
  args: {
    sessionId: v.id("analysis_sessions"),
    status: v.optional(v.union(v.literal("pending"), v.literal("running"), v.literal("completed"), v.literal("failed"))),
    commitsProcessed: v.optional(v.number()),
    currentPhase: v.optional(v.union(v.literal("cloning"), v.literal("parsing"), v.literal("ai_analysis"), v.literal("indexing"))),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, status, commitsProcessed, currentPhase, errorMessage }) => {
    const updates: any = {};
    
    if (status !== undefined) {
      updates.status = status;
      if (status === "completed" || status === "failed") {
        updates.completedAt = Date.now();
      }
    }
    
    if (commitsProcessed !== undefined) updates.commitsProcessed = commitsProcessed;
    if (currentPhase !== undefined) updates.currentPhase = currentPhase;
    
    if (errorMessage !== undefined) {
      const session = await ctx.db.get(sessionId);
      if (session) {
        updates.errorLogs = [...session.errorLogs, errorMessage];
      }
    }
    
    return await ctx.db.patch(sessionId, updates);
  },
});

export const addAnalysisError = mutation({
  args: {
    sessionId: v.id("analysis_sessions"),
    errorMessage: v.string(),
  },
  handler: async (ctx, { sessionId, errorMessage }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) {
      throw new Error("Analysis session not found");
    }
    
    return await ctx.db.patch(sessionId, {
      errorLogs: [...session.errorLogs, errorMessage],
    });
  },
});

export const completeAnalysisSession = mutation({
  args: {
    sessionId: v.id("analysis_sessions"),
    success: v.boolean(),
    finalError: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, success, finalError }) => {
    const updates: any = {
      completedAt: Date.now(),
      status: success ? "completed" : "failed",
    };
    
    if (finalError) {
      const session = await ctx.db.get(sessionId);
      if (session) {
        updates.errorLogs = [...session.errorLogs, finalError];
      }
    }
    
    return await ctx.db.patch(sessionId, updates);
  },
});