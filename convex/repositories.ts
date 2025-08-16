import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// Queries
export const getAllRepositories = query({
  handler: async (ctx) => {
    return await ctx.db.query("repositories").order("desc").collect();
  },
});

export const getRepository = query({
  args: { id: v.id("repositories") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getRepositoryByUrl = query({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    return await ctx.db
      .query("repositories")
      .filter(q => q.eq(q.field("url"), url))
      .first();
  },
});

// Mutations
export const listRepositories = query({
  handler: async (ctx) => {
    return await ctx.db.query("repositories").order("desc").collect();
  },
});

export const create = mutation({
  args: { 
    url: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    owner: v.optional(v.string()),
    status: v.optional(v.union(v.literal("cloning"), v.literal("analyzing"), v.literal("ready"), v.literal("error"))),
    totalCommits: v.optional(v.number()),
    totalFiles: v.optional(v.number()),
    primaryLanguage: v.optional(v.string()),
  },
  handler: async (ctx, { url, name, description, owner = "unknown", status = "cloning", totalCommits = 0, totalFiles = 0, primaryLanguage }) => {
    return await ctx.db.insert("repositories", {
      url,
      name,
      owner,
      description,
      clonedAt: Date.now(),
      lastAnalyzed: 0,
      status,
      totalCommits,
      totalFiles,
      primaryLanguage,
    });
  },
});

export const addRepository = mutation({
  args: { 
    url: v.string(),
    name: v.string(),
    owner: v.string(),
  },
  handler: async (ctx, { url, name, owner }) => {
    return await ctx.db.insert("repositories", {
      url,
      name,
      owner,
      clonedAt: Date.now(),
      lastAnalyzed: 0,
      status: "cloning",
      totalCommits: 0,
      totalFiles: 0,
    });
  },
});

export const updateRepositoryStatus = mutation({
  args: {
    id: v.id("repositories"),
    status: v.union(v.literal("cloning"), v.literal("analyzing"), v.literal("ready"), v.literal("error")),
    errorMessage: v.optional(v.string()),
    totalCommits: v.optional(v.number()),
    totalFiles: v.optional(v.number()),
    primaryLanguage: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, errorMessage, totalCommits, totalFiles, primaryLanguage }) => {
    const updates: any = { status };
    if (status === "ready") updates.lastAnalyzed = Date.now();
    if (errorMessage !== undefined) updates.errorMessage = errorMessage;
    if (totalCommits !== undefined) updates.totalCommits = totalCommits;
    if (totalFiles !== undefined) updates.totalFiles = totalFiles;
    if (primaryLanguage !== undefined) updates.primaryLanguage = primaryLanguage;
    
    return await ctx.db.patch(id, updates);
  },
});

export const deleteRepository = mutation({
  args: { id: v.id("repositories") },
  handler: async (ctx, { id }) => {
    // Delete related data first
    const commits = await ctx.db
      .query("commits")
      .filter(q => q.eq(q.field("repositoryId"), id))
      .collect();
    
    const files = await ctx.db
      .query("files")
      .filter(q => q.eq(q.field("repositoryId"), id))
      .collect();
    
    const questions = await ctx.db
      .query("questions")
      .filter(q => q.eq(q.field("repositoryId"), id))
      .collect();
    
    const sessions = await ctx.db
      .query("analysis_sessions")
      .filter(q => q.eq(q.field("repositoryId"), id))
      .collect();
    
    // Delete all related records
    await Promise.all([
      ...commits.map(commit => ctx.db.delete(commit._id)),
      ...files.map(file => ctx.db.delete(file._id)),
      ...questions.map(question => ctx.db.delete(question._id)),
      ...sessions.map(session => ctx.db.delete(session._id)),
    ]);
    
    // Finally delete the repository
    return await ctx.db.delete(id);
  },
});

// Actions
export const analyzeRepository = action({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    // Call Next.js API route to start background processing
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repositoryId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to start analysis: ${response.statusText}`);
    }
    
    return await response.json();
  },
});