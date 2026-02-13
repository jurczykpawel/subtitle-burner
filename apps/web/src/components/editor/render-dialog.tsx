'use client';

import { useState, useCallback } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { renderVideo, type RenderProgress } from '@/lib/ffmpeg/client-renderer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface RenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoFile: File | null;
}

export function RenderDialog({ open, onOpenChange, videoFile }: RenderDialogProps) {
  const cues = useEditorStore((s) => s.cues);
  const style = useEditorStore((s) => s.style);
  const video = useEditorStore((s) => s.video);

  const [progress, setProgress] = useState<RenderProgress>({
    phase: 'loading',
    progress: 0,
    message: '',
  });
  const [isRendering, setIsRendering] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleRender = useCallback(async () => {
    if (!videoFile || !video) return;

    setIsRendering(true);
    setResultUrl(null);

    try {
      const blob = await renderVideo(
        videoFile,
        cues,
        style,
        video.width,
        video.height,
        setProgress
      );

      const url = URL.createObjectURL(blob);
      setResultUrl(url);
    } catch (err) {
      setProgress({
        phase: 'error',
        progress: 0,
        message: err instanceof Error ? err.message : 'Render failed',
      });
    } finally {
      setIsRendering(false);
    }
  }, [videoFile, video, cues, style]);

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `${video?.filename?.replace(/\.[^.]+$/, '') || 'video'}_subtitled.mp4`;
    a.click();
  };

  const handleClose = (value: boolean) => {
    if (isRendering) return; // Prevent closing during render
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setProgress({ phase: 'loading', progress: 0, message: '' });
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Render Video</DialogTitle>
          <DialogDescription>
            Burn subtitles into your video using browser-based FFmpeg.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info */}
          <div className="rounded-md bg-muted p-3 text-sm">
            <p>
              <span className="font-medium">Video:</span> {video?.filename}
            </p>
            <p>
              <span className="font-medium">Subtitles:</span> {cues.length} cue
              {cues.length !== 1 ? 's' : ''}
            </p>
            <p>
              <span className="font-medium">Resolution:</span> {video?.width}x{video?.height}
            </p>
          </div>

          {/* Progress */}
          {isRendering && (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">{progress.message}</p>
            </div>
          )}

          {/* Error */}
          {progress.phase === 'error' && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {progress.message}
            </div>
          )}

          {/* Result */}
          {resultUrl && (
            <div className="space-y-2">
              <div className="rounded-md bg-green-500/10 p-3 text-center text-sm text-green-600 dark:text-green-400">
                Render complete!
              </div>
              <video src={resultUrl} controls className="w-full rounded-md" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {!resultUrl ? (
            <Button onClick={handleRender} disabled={isRendering || cues.length === 0}>
              {isRendering ? 'Rendering...' : 'Start Render'}
            </Button>
          ) : (
            <Button onClick={handleDownload}>Download</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
