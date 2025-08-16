import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Id } from './_generated/dataModel'

export const createThread = mutation({
  args: {
    repositoryId: v.id("repositories"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const threadId = crypto.randomUUID()
    
    return await ctx.db.insert("conversation_threads", {
      threadId,
      repositoryId: args.repositoryId,
      title: args.title,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
    })
  },
})

export const updateThreadActivity = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db
      .query("conversation_threads")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .first()
    
    if (!thread) throw new Error("Thread not found")
    
    await ctx.db.patch(thread._id, {
      lastActivity: Date.now(),
      messageCount: thread.messageCount + 1,
    })
    
    return thread._id
  },
})

export const getThreads = query({
  args: {
    repositoryId: v.id("repositories"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversation_threads")
      .withIndex("by_repository", (q) => q.eq("repositoryId", args.repositoryId))
      .order("desc")
      .take(args.limit ?? 50)
  },
})

export const getThreadMessages = query({
  args: {
    threadId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("questions")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .take(args.limit ?? 100)
  },
})

export const saveQuestion = mutation({
  args: {
    repositoryId: v.id("repositories"),
    threadId: v.optional(v.string()),
    query: v.string(),
    response: v.string(),
    relevantCommits: v.array(v.id("commits")),
    relevantFiles: v.array(v.string()),
    contextSources: v.array(v.object({
      type: v.union(v.literal("commit"), v.literal("file"), v.literal("diff")),
      reference: v.string(),
      relevanceScore: v.number(),
    })),
    processingTime: v.number(),
    confidence: v.number(),
    messageType: v.union(v.literal("user"), v.literal("assistant")),
    parentQuestionId: v.optional(v.id("questions")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("questions", {
      repositoryId: args.repositoryId,
      threadId: args.threadId,
      query: args.query,
      response: args.response,
      relevantCommits: args.relevantCommits,
      relevantFiles: args.relevantFiles,
      contextSources: args.contextSources,
      createdAt: Date.now(),
      upvotes: 0,
      processingTime: args.processingTime,
      confidence: args.confidence,
      messageType: args.messageType,
      parentQuestionId: args.parentQuestionId,
    })
  },
})

export const getQuestions = query({
  args: {
    repositoryId: v.id("repositories"),
    threadId: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.threadId) {
      const questions = await ctx.db
        .query("questions")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
        .order("desc")
        .take((args.limit ?? 20) + (args.offset ?? 0))
      
      return questions.slice(args.offset ?? 0)
    } else {
      const questions = await ctx.db
        .query("questions")
        .withIndex("by_repository", (q) => q.eq("repositoryId", args.repositoryId))
        .order("desc")
        .take((args.limit ?? 20) + (args.offset ?? 0))
      
      return questions.slice(args.offset ?? 0)
    }
  },
})

export const searchQuestions = query({
  args: {
    repositoryId: v.id("repositories"),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_repository", (q) => q.eq("repositoryId", args.repositoryId))
      .collect()
    
    return questions
      .filter(q => 
        q.query.toLowerCase().includes(args.searchTerm.toLowerCase()) ||
        q.response.toLowerCase().includes(args.searchTerm.toLowerCase())
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, args.limit ?? 20)
  },
})