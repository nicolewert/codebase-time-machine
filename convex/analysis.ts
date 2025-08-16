import { query } from './_generated/server';
import { v } from 'convex/values';
import { subDays } from 'date-fns';

export const getChangeFrequencyStats = query({
  args: {
    repositoryId: v.id('repositories'),
    fileId: v.optional(v.id('files')),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const endDate = Date.now();
    const startDate = subDays(endDate, args.days).getTime();

    // Build base query for commits
    const commitsQuery = ctx.db
      .query('commits')
      .filter(q => q.eq(q.field('repositoryId'), args.repositoryId))
      .filter(q => q.gte(q.field('date'), startDate))
      .filter(q => q.lte(q.field('date'), endDate));

    // If fileId is provided, filter for specific file
    const commits = await commitsQuery.collect();
    
    // Filter commits that include the specific fileId if provided
    const filteredCommits = args.fileId 
      ? commits.filter(commit => commit.filesChanged.includes(args.fileId!))
      : commits;

    // Aggregate changes by date
    const changesByDate = filteredCommits.reduce((acc: Record<string, any>, commit) => {
      const date = new Date(commit.date).toISOString().split('T')[0];
      
      acc[date] = acc[date] || { 
        date, 
        changes: 0, 
        files: new Set() 
      };
      
      acc[date].changes += 1;
      commit.filesChanged.forEach((file: string) => acc[date].files.add(file));

      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort
    return Object.values(changesByDate)
      .map((entry: any) => ({
        ...entry,
        files: Array.from(entry.files)
      }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
});