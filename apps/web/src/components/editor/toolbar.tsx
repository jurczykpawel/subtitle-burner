'use client';

import { useRef } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { parseSRT, formatSRT } from '@subtitle-burner/ffmpeg';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const video = useEditorStore((s) => s.video);
  const cues = useEditorStore((s) => s.cues);
  const setCues = useEditorStore((s) => s.setCues);
  const setVideo = useEditorStore((s) => s.setVideo);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const currentTime = useEditorStore((s) => s.currentTime);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const addCue = useEditorStore((s) => s.addCue);

  const handleImportSRT = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCues(parseSRT(text));
    e.target.value = '';
  };

  const handleExportSRT = () => {
    const content = formatSRT(cues);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video?.filename?.replace(/\.[^.]+$/, '') || 'subtitles'}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddCue = () => {
    addCue({
      id: crypto.randomUUID(),
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, useEditorStore.getState().duration),
      text: 'New subtitle',
    });
  };

  const handleNewProject = () => {
    setVideo(null, null);
    setCues([]);
  };

  const formatDisplayTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 border-b px-4 py-2">
      <span className="text-sm font-semibold">Subtitle Burner</span>
      <Separator orientation="vertical" className="h-6" />

      <Button variant="ghost" size="sm" onClick={handleNewProject}>
        New
      </Button>

      <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
        Import SRT
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".srt"
        className="hidden"
        onChange={handleImportSRT}
      />

      <Button variant="ghost" size="sm" onClick={handleExportSRT} disabled={cues.length === 0}>
        Export SRT
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Playback controls */}
      <Button variant="ghost" size="sm" onClick={() => setCurrentTime(Math.max(0, currentTime - 5))}>
        -5s
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          setCurrentTime(Math.min(useEditorStore.getState().duration, currentTime + 5))
        }
      >
        +5s
      </Button>
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatDisplayTime(currentTime)} / {formatDisplayTime(useEditorStore.getState().duration)}
      </span>

      <Separator orientation="vertical" className="h-6" />

      <Button variant="outline" size="sm" onClick={handleAddCue}>
        + Add Subtitle
      </Button>

      <div className="flex-1" />

      <Button variant="default" size="sm" disabled={cues.length === 0}>
        Render
      </Button>
    </div>
  );
}
