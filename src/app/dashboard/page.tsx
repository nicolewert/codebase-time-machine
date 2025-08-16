"use client";

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';
import Link from 'next/link';

export default function DashboardIndex() {
  const repositories = useQuery(api.repositories.getAllRepositories);

  if (!repositories) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Repository Dashboard</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Repository Dashboard</h1>
          <p className="text-muted-foreground mb-4">No repositories found</p>
          <Button asChild>
            <Link href="/test-repo">Clone Your First Repository</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Repository Dashboard</h1>
        <Button asChild>
          <Link href="/test-repo">Clone New Repository</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {repositories.map((repo) => (
          <Card key={repo._id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">{repo.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {repo.owner} • {repo.totalCommits} commits • {repo.totalFiles} files
                </p>
                {repo.description && (
                  <p className="text-sm text-muted-foreground mt-1">{repo.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={repo.status === 'ready' ? 'default' : repo.status === 'error' ? 'destructive' : 'secondary'}
                >
                  {repo.status}
                </Badge>
                {repo.primaryLanguage && (
                  <Badge variant="outline">{repo.primaryLanguage}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href={`/dashboard/${repo._id}`}>
                    View Dashboard
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={repo.url} target="_blank" rel="noopener noreferrer">
                    View on GitHub
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}