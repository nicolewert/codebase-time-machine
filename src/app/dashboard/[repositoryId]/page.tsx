"use client";

import { useParams } from 'next/navigation';
import { Dashboard } from '../../../components/dashboard/Dashboard';
import { Id } from '../../../../convex/_generated/dataModel';

export default function DashboardPage() {
  const params = useParams();
  const repositoryId = params.repositoryId as Id<"repositories">;

  if (!repositoryId) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Repository ID Required</h1>
          <p className="text-muted-foreground mt-2">Please provide a valid repository ID</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Dashboard repositoryId={repositoryId} />
    </div>
  );
}