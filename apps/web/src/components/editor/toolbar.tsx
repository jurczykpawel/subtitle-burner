'use client';

import { useRef, useState } from 'react';
import { useSubtitleBridge } from '@/lib/bridges/use-subtitle-bridge';
import { usePlaybackBridge } from '@/lib/bridges/use-playback-bridge';
import { useProjectBridge } from '@/lib/bridges/use-project-bridge';
import { useTranscriptionBridge } from '@/lib/bridges/use-transcription-bridge';
import { useProjectStore } from '@/store/project-store';
import { useEngineStore } from '@/store/engine-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RenderDialog } from './render-dialog';

export function Toolbar() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);
  const sbpInputRef = useRef<HTMLInputElement>(null);

  const video = useProjectStore((s) => s.video);
  const videoFile = useProjectStore((s) => s.videoFile);
  const canUndo = useProjectStore((s) => s.canUndo);
  const canRedo = useProjectStore((s) => s.canRedo);
  const undoDescription = useProjectStore((s) => s.undoDescription);
  const redoDescription = useProjectStore((s) => s.redoDescription);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);

  const { cues, addCue } = useSubtitleBridge();
  const { currentTime, duration, isPlaying, togglePlay, stepForward, stepBackward, formatTime } =
    usePlaybackBridge(videoRef);
  const { importSRT, exportSRT, importSBP, exportSBP, newProject } = useProjectBridge();
  const {
    status: transcriptionStatus,
    progress: transcriptionProgress,
    error: transcriptionError,
    isTranscribing,
    transcribe,
    cancel: cancelTranscription,
  } = useTranscriptionBridge();

  const resetTranscription = useEngineStore((s) => s.resetTranscription);

  const [renderOpen, setRenderOpen] = useState(false);

  const handleImportSRT = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importSRT(file);
    e.target.value = '';
  };

  const handleImportSBP = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importSBP(file);
    e.target.value = '';
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <span className="text-sm font-semibold">Subtitle Burner</span>
        <Separator orientation="vertical" className="h-6" />

        <Button variant="ghost" size="sm" onClick={newProject}>
          New
        </Button>

        <Button variant="ghost" size="sm" onClick={() => srtInputRef.current?.click()}>
          Import SRT
        </Button>
        <input
          ref={srtInputRef}
          type="file"
          accept=".srt"
          className="hidden"
          onChange={handleImportSRT}
        />

        <Button variant="ghost" size="sm" onClick={exportSRT} disabled={cues.length === 0}>
          Export SRT
        </Button>

        <Button variant="ghost" size="sm" onClick={() => sbpInputRef.current?.click()}>
          Import .sbp
        </Button>
        <input
          ref={sbpInputRef}
          type="file"
          accept=".sbp,.json"
          className="hidden"
          onChange={handleImportSBP}
        />

        <Button variant="ghost" size="sm" onClick={exportSBP} disabled={!video || cues.length === 0}>
          Export .sbp
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo/Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}>
              Undo
            </Button>
          </TooltipTrigger>
          {undoDescription && <TooltipContent>{undoDescription}</TooltipContent>}
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo}>
              Redo
            </Button>
          </TooltipTrigger>
          {redoDescription && <TooltipContent>{redoDescription}</TooltipContent>}
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {/* Playback controls */}
        <Button variant="ghost" size="sm" onClick={() => stepBackward(5)}>
          -5s
        </Button>
        <Button variant="ghost" size="sm" onClick={togglePlay}>
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => stepForward(5)}>
          +5s
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <Separator orientation="vertical" className="h-6" />

        <Button variant="outline" size="sm" onClick={() => addCue()}>
          + Add Subtitle
        </Button>

        {video && (
          <>
            {isTranscribing ? (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${transcriptionProgress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Math.round(transcriptionProgress)}%
                </span>
                <Button variant="ghost" size="sm" onClick={cancelTranscription}>
                  Cancel
                </Button>
              </div>
            ) : transcriptionStatus === 'error' ? (
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="max-w-[120px] truncate text-xs text-destructive">
                      {transcriptionError || 'Failed'}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{transcriptionError || 'Transcription failed'}</TooltipContent>
                </Tooltip>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetTranscription();
                    const videoEl = document.querySelector('video');
                    if (videoEl) transcribe(videoEl);
                  }}
                >
                  Retry
                </Button>
                <Button variant="ghost" size="sm" onClick={resetTranscription}>
                  Dismiss
                </Button>
              </div>
            ) : transcriptionStatus === 'ready' ? (
              <span className="text-xs text-green-600 dark:text-green-400">Transcribed</span>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const videoEl = document.querySelector('video');
                      if (videoEl) transcribe(videoEl);
                    }}
                  >
                    Transcribe
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate subtitles with word-level timing using Whisper</TooltipContent>
              </Tooltip>
            )}
          </>
        )}

        <div className="flex-1" />

        <Button
          variant="default"
          size="sm"
          disabled={cues.length === 0}
          onClick={() => setRenderOpen(true)}
        >
          Render
        </Button>
      </div>

      <RenderDialog open={renderOpen} onOpenChange={setRenderOpen} videoFile={videoFile} />
    </>
  );
}
