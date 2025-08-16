import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
    createdAt: v.number(),
  }).index('by_created_at', ['createdAt']),

  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_email', ['email']),

  notes: defineTable({
    title: v.string(),
    content: v.string(),
    userId: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_user', ['userId'])
    .index('by_created_at', ['createdAt']),

  repositories: defineTable({
    url: v.string(),
    name: v.string(),
    owner: v.string(),
    description: v.optional(v.string()),
    clonedAt: v.number(),
    lastAnalyzed: v.number(),
    status: v.union(v.literal("cloning"), v.literal("analyzing"), v.literal("ready"), v.literal("error")),
    errorMessage: v.optional(v.string()),
    totalCommits: v.number(),
    totalFiles: v.number(),
    primaryLanguage: v.optional(v.string()),
  }).index('by_status', ['status'])
    .index('by_owner', ['owner'])
    .index('by_url', ['url']),

  analysis_sessions: defineTable({
    repositoryId: v.id("repositories"),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("completed"), v.literal("failed")),
    commitsProcessed: v.number(),
    totalCommits: v.number(),
    currentPhase: v.union(v.literal("cloning"), v.literal("parsing"), v.literal("ai_analysis"), v.literal("indexing")),
    errorLogs: v.array(v.string()),
  }).index('by_repository', ['repositoryId'])
    .index('by_status', ['status'])
    .index('by_started_at', ['startedAt']),

  commits: defineTable({
    repositoryId: v.id("repositories"),
    sha: v.string(),
    message: v.string(),
    author: v.string(),
    authorEmail: v.string(),
    date: v.number(),
    filesChanged: v.array(v.string()),
    linesAdded: v.number(),
    linesDeleted: v.number(),
    aiSummary: v.optional(v.string()),
    tags: v.array(v.string()),
    businessImpact: v.optional(v.string()),
    complexityScore: v.optional(v.number()),
  }).index('by_repository', ['repositoryId'])
    .index('by_sha', ['sha'])
    .index('by_date', ['date'])
    .index('by_author', ['author']),

  files: defineTable({
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
  }).index('by_repository', ['repositoryId'])
    .index('by_path', ['path'])
    .index('by_extension', ['extension'])
    .index('by_complexity', ['maxComplexity']),

  questions: defineTable({
    repositoryId: v.id("repositories"),
    query: v.string(),
    response: v.string(),
    relevantCommits: v.array(v.id("commits")),
    relevantFiles: v.array(v.string()),
    createdAt: v.number(),
    upvotes: v.number(),
    processingTime: v.number(),
    confidence: v.number(),
  }).index('by_repository', ['repositoryId'])
    .index('by_created_at', ['createdAt'])
    .index('by_confidence', ['confidence']),
})