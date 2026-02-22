'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useProjectStore } from '@/store/project-store';
import { useTimelineStore } from '@/store/timeline-store';
import { parseSRT } from '@subtitle-burner/ffmpeg';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ACCEPTED_VIDEO_TYPES = {
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
  'video/x-matroska': ['.mkv'],
};

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export function VideoUploader() {
  const setVideo = useProjectStore((s) => s.setVideo);
  const setCues = useProjectStore((s) => s.setCues);
  const setDuration = useTimelineStore((s) => s.setDuration);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const url = URL.createObjectURL(file);

      // Extract metadata from video element
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.onloadedmetadata = () => {
        setVideo(
          {
            id: crypto.randomUUID(),
            filename: file.name,
            fileSize: file.size,
            duration: videoEl.duration,
            width: videoEl.videoWidth,
            height: videoEl.videoHeight,
            mimeType: file.type,
          },
          url,
          file
        );
        setDuration(videoEl.duration);
      };
      videoEl.src = url;
    },
    [setVideo, setDuration]
  );

  const onDropSRT = useCallback(
    async (e: React.DragEvent | React.ChangeEvent<HTMLInputElement>) => {
      let file: File | undefined;

      if ('dataTransfer' in e) {
        file = Array.from(e.dataTransfer.files).find((f) => f.name.endsWith('.srt'));
      } else {
        file = e.target.files?.[0];
      }

      if (!file) return;

      const text = await file.text();
      const cues = parseSRT(text);
      setCues(cues);
    },
    [setCues]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_VIDEO_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Subtitle Burner</h1>
        <p className="mt-2 text-muted-foreground">
          Add styled subtitles to your videos
        </p>
      </div>

      <Card className="w-full max-w-lg">
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <svg
              className="mb-4 h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            {isDragActive ? (
              <p className="text-primary">Drop your video here</p>
            ) : (
              <>
                <p className="font-medium">Drop a video file here</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  MP4, WebM, MOV, MKV — up to 500MB
                </p>
              </>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 border-t" />
            <span className="text-xs text-muted-foreground">or import subtitles</span>
            <div className="flex-1 border-t" />
          </div>

          <div className="mt-4 flex justify-center">
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                Import SRT file
                <input
                  type="file"
                  accept=".srt"
                  className="hidden"
                  onChange={onDropSRT}
                />
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
