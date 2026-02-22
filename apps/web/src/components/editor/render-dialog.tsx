'use client';

import { useState } from 'react';
import { useRenderBridge } from '@/lib/bridges/use-render-bridge';
import { useAuth } from '@/components/providers/auth-provider';
import { useProjectStore } from '@/store/project-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type RenderMode = 'client' | 'server';

interface RenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoFile: File | null;
}

export function RenderDialog({ open, onOpenChange }: RenderDialogProps) {
  const video = useProjectStore((s) => s.video);
  const cues = useProjectStore((s) => s.cues);
  const { user } = useAuth();

  const {
    renderStatus,
    renderProgress,
    renderMessage,
    renderResultUrl,
    isRendering,
    canRender,
    renderClient,
    renderServer,
    downloadResult,
    cleanup,
  } = useRenderBridge();

  const [mode, setMode] = useState<RenderMode>('client');

  const handleRender = mode === 'client' ? renderClient : renderServer;

  const handleClose = (value: boolean) => {
    if (isRendering) return;
    cleanup();
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Render Video</DialogTitle>
          <DialogDescription>Burn subtitles into your video.</DialogDescription>
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

          {/* Render mode selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Render mode</span>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as RenderMode)}
              disabled={isRendering}
            >
              <SelectTrigger size="sm" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Browser (FFmpeg.wasm)</SelectItem>
                <SelectItem value="server" disabled={!user}>
                  Server{!user ? ' (sign in required)' : ''}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === 'client' && (
            <p className="text-xs text-muted-foreground">
              Renders entirely in your browser. No upload needed, but slower on long videos.
            </p>
          )}
          {mode === 'server' && (
            <p className="text-xs text-muted-foreground">
              Renders on our servers. Faster for long videos. Video is uploaded temporarily.
            </p>
          )}

          {/* Progress */}
          {isRendering && (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">{renderMessage}</p>
            </div>
          )}

          {/* Error */}
          {renderStatus === 'error' && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {renderMessage}
            </div>
          )}

          {/* Result */}
          {renderResultUrl && (
            <div className="space-y-2">
              <div className="rounded-md bg-green-500/10 p-3 text-center text-sm text-green-600 dark:text-green-400">
                Render complete!
              </div>
              {mode === 'client' && <video src={renderResultUrl} controls className="w-full rounded-md" />}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {!renderResultUrl ? (
            <Button
              onClick={handleRender}
              disabled={isRendering || !canRender}
            >
              {isRendering ? 'Rendering...' : 'Start Render'}
            </Button>
          ) : (
            <Button onClick={downloadResult}>Download</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
