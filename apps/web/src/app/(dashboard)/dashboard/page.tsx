'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface VideoProject {
  id: string;
  filename: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/videos')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link href="/dashboard/new">
          <Button>New Project</Button>
        </Link>
      </div>

      {loading ? (
        <div className="mt-12 text-center text-muted-foreground">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">No projects yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload a video to get started, or use the{' '}
            <Link href="/" className="underline">
              local editor
            </Link>{' '}
            without an account.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/${project.id}`}
              className="rounded-lg border p-4 hover:bg-muted"
            >
              <div className="aspect-video rounded bg-muted" />
              <p className="mt-3 truncate font-medium">{project.filename}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
