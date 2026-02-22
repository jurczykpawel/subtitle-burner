'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VideoUploader } from '@/components/video/video-uploader';
import { useProjectStore } from '@/store/project-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewProjectPage() {
  const router = useRouter();
  const videoUrl = useProjectStore((s) => s.videoUrl);
  const video = useProjectStore((s) => s.video);
  const reset = useProjectStore((s) => s.reset);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const uploadStarted = useRef(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => {
    if (!videoUrl || !video || uploading || uploadStarted.current) return;

    const videoFile = useProjectStore.getState().videoFile;
    if (!videoFile) {
      setError('No video file selected');
      return;
    }

    uploadStarted.current = true;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('duration', String(video.duration));
    formData.append('width', String(video.width));
    formData.append('height', String(video.height));

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const project = JSON.parse(xhr.responseText);
          router.push(`/dashboard/${project.id}`);
        } catch {
          setError('Invalid response from server');
          setUploading(false);
        }
      } else {
        let message = `Upload failed (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.error) message = body.error;
        } catch {
          // use default message
        }
        setError(message);
        setUploading(false);
      }
    });

    xhr.addEventListener('error', () => {
      setError('Network error — check your connection and try again');
      setUploading(false);
    });

    xhr.addEventListener('abort', () => {
      setUploading(false);
    });

    xhr.open('POST', '/api/videos');
    xhr.send(formData);

    return () => {
      xhrRef.current = null;
    };
  }, [videoUrl, video, uploading, router]);

  const handleRetry = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    uploadStarted.current = false;
    setError('');
    setProgress(0);
    reset();
  };

  const videoFile = useProjectStore.getState().videoFile;

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <h1 className="mb-8 text-2xl font-bold">New Project</h1>
      {error && (
        <div className="mb-4 w-full max-w-lg rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          <p>{error}</p>
          <button
            onClick={handleRetry}
            className="mt-2 text-xs underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}
      {uploading ? (
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <svg
                className="h-10 w-10 animate-spin text-primary"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <div className="w-full text-center">
                <p className="font-medium">Uploading video...</p>
                {videoFile && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {videoFile.name} ({formatBytes(videoFile.size)})
                  </p>
                )}
              </div>
              <div className="w-full">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  {progress}%
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRetry}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <VideoUploader />
      )}
    </div>
  );
}
