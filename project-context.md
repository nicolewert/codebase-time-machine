# Codebase Time Machine - Hackathon Context Document

## Project Overview

A real-time codebase analysis platform that clones Git repositories, analyzes their complete history, and uses AI to provide semantic understanding of code evolution over time. Users can ask natural language questions about architectural decisions, feature evolution, and development patterns while visualizing code complexity and ownership trends through an interactive dashboard.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Convex (real-time, TypeScript-native)
- **Styling**: Tailwind CSS v3
- **Components**: shadcn/ui (New York style)
- **Package Manager**: pnpm
- **Build Tool**: Turbopack
- **Language**: TypeScript
- **MCP Servers**: Convex + Playwright + Vercel for Claude Code
- **AI Integration**: Claude API

## Database Schema

### repositories
```typescript
{
  _id: Id<"repositories">,
  url: string,              // GitHub/Git repository URL
  name: string,             // Repository name (extracted from URL)
  owner: string,            // Repository owner/organization
  clonedAt: number,         // Timestamp when cloning started
  lastAnalyzed: number,     // Timestamp of last complete analysis
  status: "cloning" | "analyzing" | "ready" | "error",
  errorMessage?: string,    // Error details if status is "error"
  totalCommits: number,     // Total number of commits analyzed
  totalFiles: number,       // Total number of files tracked
  primaryLanguage?: string, // Detected primary programming language
}
```

### commits
```typescript
{
  _id: Id<"commits">,
  repositoryId: Id<"repositories">,  // Foreign key to repositories
  sha: string,                       // Git commit hash (unique)
  message: string,                   // Commit message
  author: string,                    // Commit author name
  authorEmail: string,               // Commit author email
  date: number,                      // Commit timestamp
  filesChanged: string[],            // Array of file paths modified
  linesAdded: number,                // Lines of code added
  linesDeleted: number,              // Lines of code deleted
  aiSummary?: string,                // AI-generated semantic summary
  tags: string[],                    // AI-extracted tags (e.g., ["feature", "auth", "bugfix"])
  businessImpact?: string,           // AI assessment of business significance
  complexityScore?: number,          // Calculated complexity (0-100)
}
```

### files
```typescript
{
  _id: Id<"files">,
  repositoryId: Id<"repositories">,  // Foreign key to repositories
  path: string,                      // Full file path from repository root
  extension: string,                 // File extension (.js, .py, etc.)
  firstSeen: number,                 // Timestamp when file was first created
  lastModified: number,              // Timestamp of last modification
  totalChanges: number,              // Number of commits that modified this file
  currentSize: number,               // Current file size in bytes
  maxComplexity: number,             // Highest complexity score achieved
  avgComplexity: number,             // Average complexity across all versions
  primaryAuthors: string[],          // Top 3 contributors by lines changed
  isDeleted: boolean,                // Whether file has been deleted
  language?: string,                 // Detected programming language
}
```

### questions
```typescript
{
  _id: Id<"questions">,
  repositoryId: Id<"repositories">,  // Foreign key to repositories
  query: string,                     // User's natural language question
  response: string,                  // AI-generated answer
  relevantCommits: Id<"commits">[],  // Commits that informed the answer
  relevantFiles: string[],           // File paths that informed the answer
  createdAt: number,                 // Timestamp of question
  upvotes: number,                   // User rating (for future improvement)
  processingTime: number,            // Time taken to generate answer (ms)
  confidence: number,                // AI confidence score (0-100)
}
```

### analysis_sessions
```typescript
{
  _id: Id<"analysis_sessions">,
  repositoryId: Id<"repositories">,  // Foreign key to repositories
  startedAt: number,                 // Analysis start timestamp
  completedAt?: number,              // Analysis completion timestamp
  status: "pending" | "running" | "completed" | "failed",
  commitsProcessed: number,          // Progress tracking
  totalCommits: number,              // Total commits to process
  currentPhase: "cloning" | "parsing" | "ai_analysis" | "indexing",
  errorLogs: string[],               // Array of error messages
}
```

## API Contract

### Convex Queries

```typescript
// Get all repositories for dashboard
export const getAllRepositories = query({
  handler: async (ctx) => {
    return await ctx.db.query("repositories").collect();
  },
});

// Get repository details with status
export const getRepository = query({
  args: { id: v.id("repositories") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Get commit history with pagination
export const getCommits = query({
  args: { 
    repositoryId: v.id("repositories"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { repositoryId, limit = 50, cursor }) => {
    let query = ctx.db
      .query("commits")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .order("desc");
    
    if (cursor) {
      query = query.paginate({ cursor, numItems: limit });
    }
    
    return await query.take(limit);
  },
});

// Get file analysis data
export const getFiles = query({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    return await ctx.db
      .query("files")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .collect();
  },
});

// Get previous questions and answers
export const getQuestions = query({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    return await ctx.db
      .query("questions")
      .filter(q => q.eq(q.field("repositoryId"), repositoryId))
      .order("desc")
      .take(20);
  },
});

// Get analysis session status
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
```

### Convex Mutations

```typescript
// Add new repository to analyze
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

// Update repository status during processing
export const updateRepositoryStatus = mutation({
  args: {
    id: v.id("repositories"),
    status: v.union(v.literal("cloning"), v.literal("analyzing"), v.literal("ready"), v.literal("error")),
    errorMessage: v.optional(v.string()),
    totalCommits: v.optional(v.number()),
    totalFiles: v.optional(v.number()),
  },
  handler: async (ctx, { id, status, errorMessage, totalCommits, totalFiles }) => {
    const updates: any = { status };
    if (status === "ready") updates.lastAnalyzed = Date.now();
    if (errorMessage) updates.errorMessage = errorMessage;
    if (totalCommits) updates.totalCommits = totalCommits;
    if (totalFiles) updates.totalFiles = totalFiles;
    
    return await ctx.db.patch(id, updates);
  },
});

// Bulk insert commits from git parsing
export const insertCommits = mutation({
  args: { commits: v.array(v.any()) },
  handler: async (ctx, { commits }) => {
    const insertPromises = commits.map(commit => 
      ctx.db.insert("commits", commit)
    );
    return await Promise.all(insertPromises);
  },
});

// Update commit with AI analysis
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

// Insert file analysis data
export const insertFiles = mutation({
  args: { files: v.array(v.any()) },
  handler: async (ctx, { files }) => {
    const insertPromises = files.map(file => 
      ctx.db.insert("files", file)
    );
    return await Promise.all(insertPromises);
  },
});

// Save question and AI response
export const saveQuestion = mutation({
  args: {
    repositoryId: v.id("repositories"),
    query: v.string(),
    response: v.string(),
    relevantCommits: v.array(v.id("commits")),
    relevantFiles: v.array(v.string()),
    confidence: v.number(),
    processingTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("questions", {
      ...args,
      createdAt: Date.now(),
      upvotes: 0,
    });
  },
});
```

### Convex Actions

```typescript
// Trigger repository cloning and analysis
export const analyzeRepository = action({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    // Call Next.js API route to start background processing
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repositoryId }),
    });
    return response.json();
  },
});

// Process AI question about repository
export const askQuestion = action({
  args: {
    repositoryId: v.id("repositories"),
    query: v.string(),
  },
  handler: async (ctx, { repositoryId, query }) => {
    const startTime = Date.now();
    
    // Get relevant commits and files
    const commits = await ctx.runQuery(api.queries.getCommits, { repositoryId });
    const files = await ctx.runQuery(api.queries.getFiles, { repositoryId });
    
    // Call Claude API for analysis
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/ai/question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, commits, files }),
    });
    
    const result = await response.json();
    const processingTime = Date.now() - startTime;
    
    // Save the Q&A pair
    await ctx.runMutation(api.mutations.saveQuestion, {
      repositoryId,
      query,
      response: result.answer,
      relevantCommits: result.relevantCommits,
      relevantFiles: result.relevantFiles,
      confidence: result.confidence,
      processingTime,
    });
    
    return result;
  },
});
```

## Component Architecture

### Layout Components
```typescript
// app/layout.tsx - Root layout with providers
<ConvexClientProvider>
  <ThemeProvider>
    <Navbar />
    <main>{children}</main>
    <Toaster />
  </ThemeProvider>
</ConvexClientProvider>

// components/ui/navbar.tsx - Navigation with repository switcher
interface NavbarProps {
  currentRepo?: Repository;
}
```

### Core Components
```typescript
// components/repository/RepoCard.tsx - Repository status card
interface RepoCardProps {
  repository: Repository;
  onSelect: (id: Id<"repositories">) => void;
  showAnalysisButton?: boolean;
}

// components/repository/RepoInput.tsx - Add repository form
interface RepoInputProps {
  onSubmit: (url: string) => Promise<void>;
  loading: boolean;
}

// components/commits/CommitTimeline.tsx - Interactive commit history
interface CommitTimelineProps {
  repositoryId: Id<"repositories">;
  commits: Commit[];
  onCommitSelect?: (commit: Commit) => void;
}

// components/commits/CommitCard.tsx - Individual commit display
interface CommitCardProps {
  commit: Commit;
  expanded?: boolean;
  showFiles?: boolean;
  onToggle?: () => void;
}

// components/files/FileExplorer.tsx - File tree with complexity heatmap
interface FileExplorerProps {
  repositoryId: Id<"repositories">;
  files: FileAnalysis[];
  sortBy: "name" | "complexity" | "changes";
}

// components/ai/ChatInterface.tsx - Q&A interface
interface ChatInterfaceProps {
  repositoryId: Id<"repositories">;
  previousQuestions: Question[];
  onNewQuestion: (query: string) => Promise<void>;
}

// components/analytics/ComplexityChart.tsx - Trends visualization
interface ComplexityChartProps {
  data: Array<{
    date: string;
    complexity: number;
    commits: number;
    files: number;
  }>;
  timeRange: "week" | "month" | "year" | "all";
}

// components/analytics/OwnershipMap.tsx - Code ownership visualization
interface OwnershipMapProps {
  files: FileAnalysis[];
  showEmails?: boolean;
  groupBy: "author" | "file" | "complexity";
}
```

### Shared UI Components (shadcn/ui)
```typescript
// All components follow shadcn/ui New York style
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
```

## Routing Structure

### Page Routes
```typescript
// app/page.tsx - Landing page + repository input
export default function HomePage() {
  // Repository list and add new repository form
}

// app/repo/[id]/page.tsx - Main repository dashboard
interface RepoPageProps {
  params: { id: string };
}
export default function RepoPage({ params }: RepoPageProps) {
  // Overview with recent commits, file stats, and quick actions
}

// app/repo/[id]/commits/page.tsx - Commit history timeline
export default function CommitsPage({ params }: RepoPageProps) {
  // Detailed commit timeline with filtering and search
}

// app/repo/[id]/files/page.tsx - File explorer and analysis
export default function FilesPage({ params }: RepoPageProps) {
  // File tree with complexity heatmap and ownership data
}

// app/repo/[id]/ask/page.tsx - AI Q&A interface
export default function AskPage({ params }: RepoPageProps) {
  // Chat interface for asking questions about the codebase
}

// app/repo/[id]/analytics/page.tsx - Trends and visualizations
export default function AnalyticsPage({ params }: RepoPageProps) {
  // Charts showing complexity trends, ownership, and patterns
}

// app/repo/[id]/settings/page.tsx - Repository settings
export default function SettingsPage({ params }: RepoPageProps) {
  // Re-analyze, delete, configure AI parameters
}
```

### API Routes
```typescript
// app/api/analyze/route.ts - Background analysis processor
POST /api/analyze
Body: { repositoryId: string }
Response: { success: boolean, sessionId: string }

// app/api/clone/route.ts - Git cloning service
POST /api/clone
Body: { url: string, repositoryId: string }
Response: { success: boolean, path: string }

// app/api/ai/analyze-commit/route.ts - Single commit AI analysis
POST /api/ai/analyze-commit
Body: { commitData: Commit, context: string[] }
Response: { summary: string, tags: string[], businessImpact: string }

// app/api/ai/question/route.ts - Natural language Q&A
POST /api/ai/question
Body: { query: string, commits: Commit[], files: FileAnalysis[] }
Response: { answer: string, relevantCommits: string[], confidence: number }

// app/api/git/[...path]/route.ts - Git operations proxy
GET /api/git/[repositoryId]/log - Get raw git log
GET /api/git/[repositoryId]/diff/[sha] - Get commit diff
GET /api/git/[repositoryId]/blame/[file] - Get file blame information
```

### Navigation Flow
```typescript
// Primary navigation structure
HomePage -> RepoPage(overview) -> [
  CommitsPage(history),
  FilesPage(explorer),
  AskPage(chat),
  AnalyticsPage(trends),
  SettingsPage(config)
]

// Breadcrumb navigation pattern
Home > [Repository Name] > [Current Section]

// Quick actions from any page
- Search commits globally
- Ask AI question (modal)
- Switch repositories (dropdown)
- Share current view (URL params)
```

## Integration Points

### Git Analysis Pipeline
```typescript
// Flow: Repository URL -> Clone -> Parse -> AI Analysis -> Database
1. User submits repository URL
2. API validates and creates repository record
3. Background job clones repository to temp directory
4. Git parser extracts commits, files, and stats
5. AI service analyzes commits for semantic meaning
6. Data is stored in Convex with real-time updates
7. Frontend reactively updates as analysis progresses
```

### AI Processing Chain
```typescript
// Claude API integration points
1. Commit Analysis: Individual commit diffs -> semantic summaries
2. Question Answering: User query + repo context -> natural language response
3. Pattern Detection: Code changes -> architectural insights
4. Business Impact: Technical changes -> business feature mapping
```

### Real-time Updates
```typescript
// Convex subscriptions for live updates
- Repository status changes (cloning -> analyzing -> ready)
- New commits being processed (progress tracking)
- AI analysis completions (commit summaries appearing)
- New questions and answers (chat updates)
- Error states and recovery (user notifications)
```

### Cross-Component Communication
```typescript
// State management patterns
- Repository selection: URL params + context provider
- Filtering state: URL search params for shareable links
- AI chat state: Local state with Convex persistence
- Analysis progress: Real-time subscriptions
- Error boundaries: Component-level error handling
```

### External Service Dependencies
```typescript
// Required environment variables
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
CLAUDE_API_KEY=
NEXT_PUBLIC_URL= (for webhooks)

// Service availability checks
- Git binary availability (server-side)
- Claude API rate limits and fallbacks
- Temporary storage cleanup (cloned repositories)
- Database connection health monitoring
```

## Performance Considerations

### Data Loading Patterns
- Infinite scroll for commit history
- Virtual scrolling for large file lists
- Progressive enhancement for AI features
- Optimistic updates for user interactions

### Caching Strategy
- Static generation for public repositories
- Client-side caching of repository metadata
- Debounced search and filtering
- Background prefetching of common queries

### Error Recovery
- Graceful degradation when AI is unavailable
- Repository re-analysis capability
- Partial data display during processing
- User notification system for long-running operations