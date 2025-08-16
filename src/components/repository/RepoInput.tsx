import React, { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, GithubIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// GitHub URL validation schema
const githubRepoSchema = z.object({
  url: z.string().url().refine(
    (url) => {
      const githubRegex = /^https?:\/\/(www\.)?github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-_]+)$/;
      return githubRegex.test(url);
    },
    { message: 'Invalid GitHub repository URL' }
  )
});

type GithubRepoFormData = z.infer<typeof githubRepoSchema>;

// GitHub API metadata type
interface RepoMetadata {
  name: string;
  owner: string;
  description?: string;
  stars?: number;
  language?: string;
}

interface RepoInputProps {
  onSubmit: (url: string, metadata: RepoMetadata) => Promise<void>;
  loading: boolean;
}

export function RepoInput({ onSubmit, loading }: RepoInputProps) {
  const [repoMetadata, setRepoMetadata] = useState<RepoMetadata | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<GithubRepoFormData>({
    resolver: zodResolver(githubRepoSchema),
    defaultValues: {
      url: ''
    }
  });

  const extractRepoInfo = (url: string): { owner: string; repo: string } | null => {
    const match = url.match(/github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-_]+)/);
    return match ? { owner: match[1], repo: match[2] } : null;
  };

  const handleSubmit = async (data: GithubRepoFormData) => {
    const { url } = data;
    setApiError(null);
    setRepoMetadata(null);

    try {
      const repoInfo = extractRepoInfo(url);
      if (!repoInfo) {
        throw new Error('Invalid GitHub URL');
      }

      const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch repository metadata');
      }

      const repoData = await response.json();
      const metadata: RepoMetadata = {
        name: repoData.name,
        owner: repoData.owner.login,
        description: repoData.description || '',
        stars: repoData.stargazers_count,
        language: repoData.language
      };

      setRepoMetadata(metadata);
      await onSubmit(url, metadata);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setApiError(errorMessage);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GitHub Repository URL</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://github.com/username/repository" 
                    {...field}
                    className="bg-white/90 focus:ring-2 focus:ring-primary/50"
                  />
                </FormControl>
                <FormDescription>
                  Enter a valid GitHub repository URL
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white"
          >
            {loading ? 'Fetching Repository...' : 'Get Repository Details'}
          </Button>
        </form>
      </Form>

      {apiError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <Card className="mt-4 bg-background/50">
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </CardContent>
        </Card>
      )}

      {repoMetadata && (
        <Card className="mt-4 bg-background/50 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GithubIcon className="h-5 w-5" />
              {repoMetadata.name}
            </CardTitle>
            <CardDescription>{repoMetadata.owner}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{repoMetadata.description || 'No description available'}</p>
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>Language: {repoMetadata.language || 'Not specified'}</span>
              <span>Stars: {repoMetadata.stars || 0}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}