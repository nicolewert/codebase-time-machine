'use client';

import { useState } from 'react';
import { RepoInput, RepoCard } from '@/components/repository';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RepoMetadata {
  name: string;
  owner: string;
  description?: string;
  stars?: number;
  language?: string;
}

export default function TestRepoPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Get all repositories from Convex
  const repositories = useQuery(api.repositories.getAllRepositories);
  
  // Mutations
  const addRepo = useMutation(api.repositories.addRepository);
  const deleteRepo = useMutation(api.repositories.deleteRepository);

  const handleRepoSubmit = async (url: string, metadata: RepoMetadata) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if repository already exists
      const existingRepo = repositories?.find(repo => repo.url === url);
      if (existingRepo) {
        setError('Repository already exists in the database');
        return;
      }

      // Add repository to Convex
      const repoId = await addRepo({
        url,
        name: metadata.name,
        owner: metadata.owner,
      });

      setSuccess(`Repository "${metadata.name}" added successfully!`);
      
      // Start the cloning process via API
      const response = await fetch('/api/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId: repoId,
          url,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start cloning process');
      }

      const result = await response.json();
      setSuccess(`Repository added and cloning started! Session ID: ${result.sessionId}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Repository submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyze = async (id: string) => {
    try {
      const response = await fetch('/api/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repositoryId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start analysis');
      }

      setSuccess('Analysis started successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start analysis';
      setError(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRepo({ id: id as Id<"repositories"> });
      setSuccess('Repository deleted successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete repository';
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Repository Management Demo</h1>
          <p className="text-muted-foreground">
            Test the complete repository addition form with Git cloning pipeline integration
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Repository Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Repository</CardTitle>
            <CardDescription>
              Enter a GitHub repository URL to add it to the system for analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <RepoInput onSubmit={handleRepoSubmit} loading={isSubmitting} />
          </CardContent>
        </Card>

        {/* Repository List */}
        <Card>
          <CardHeader>
            <CardTitle>Existing Repositories</CardTitle>
            <CardDescription>
              {repositories?.length === 0 
                ? 'No repositories added yet'
                : `${repositories?.length || 0} repositories in the database`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {repositories === undefined ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading repositories...</p>
              </div>
            ) : repositories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No repositories found. Add one above to get started!</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {repositories.map((repo) => (
                  <RepoCard
                    key={repo._id}
                    repository={repo}
                    onAnalyze={handleAnalyze}
                    onDelete={handleDelete}
                    onSelect={() => {
                      setSuccess(`Selected repository: ${repo.name}`);
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Convex Status:</strong> {repositories === undefined ? 'Loading...' : 'Connected'}</div>
              <div><strong>Repository Count:</strong> {repositories?.length || 0}</div>
              <div><strong>API Endpoint:</strong> /api/clone</div>
              <div><strong>Components:</strong> RepoInput ✓, RepoCard ✓</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}