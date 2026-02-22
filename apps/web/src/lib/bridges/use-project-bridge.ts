'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useTimelineStore } from '@/store/timeline-store';
import { useEngineStore } from '@/store/engine-store';
import { useUIStore } from '@/store/ui-store';
import { parseSRT, formatSRT } from '@subtitle-burner/ffmpeg';


/**
 * Bridge between UI and ProjectSerializer + ProjectStore.
 * Handles save/load, import/export, and auto-save.
 */
export function useProjectBridge(projectId?: string) {
  const video = useProjectStore((s) => s.video);
  const cues = useProjectStore((s) => s.cues);
  const style = useProjectStore((s) => s.style);
  const isDirty = useProjectStore((s) => s.isDirty);
  const setCues = useProjectStore((s) => s.setCues);
  const setStyle = useProjectStore((s) => s.setStyle);
  const setVideo = useProjectStore((s) => s.setVideo);
  const markClean = useProjectStore((s) => s.markClean);
  const reset = useProjectStore((s) => s.reset);

  const setDuration = useTimelineStore((s) => s.setDuration);

  const getProjectSerializer = useEngineStore((s) => s.getProjectSerializer);

  const autoSave = useUIStore((s) => s.autoSave);
  const autoSaveIntervalMs = useUIStore((s) => s.autoSaveIntervalMs);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(true);

  // Load project from API
  const loadProject = useCallback(
    async (id: string) => {
      initialLoadRef.current = true;
      try {
        const [videoRes, subRes] = await Promise.all([
          fetch(`/api/videos/${id}`),
          fetch(`/api/videos/${id}/subtitles`),
        ]);

        if (videoRes.ok) {
          const videoData = await videoRes.json();
          setVideo(
            {
              id: videoData.id,
              filename: videoData.filename ?? 'video',
              fileSize: videoData.fileSize ?? 0,
              mimeType: videoData.mimeType ?? 'video/mp4',
              width: videoData.width ?? 1920,
              height: videoData.height ?? 1080,
              duration: videoData.duration ?? 0,
            },
            videoData.url
          );
          if (videoData.duration) setDuration(videoData.duration);
        }

        if (subRes.ok) {
          const sub = await subRes.json();
          if (sub?.content) setCues(sub.content);
          if (sub?.style) setStyle(sub.style);
        }
      } catch {
        // silently fail - user can still use the editor
      } finally {
        initialLoadRef.current = false;
        markClean();
      }
    },
    [setVideo, setCues, setStyle, setDuration, markClean]
  );

  // Auto-save
  useEffect(() => {
    if (!autoSave || !projectId || !isDirty || initialLoadRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      fetch(`/api/videos/${projectId}/subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cues, style }),
      })
        .then(() => markClean())
        .catch(() => {});
    }, autoSaveIntervalMs);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [autoSave, autoSaveIntervalMs, projectId, isDirty, cues, style, markClean]);

  // Import SRT file
  const importSRT = useCallback(
    async (file: File) => {
      const text = await file.text();
      setCues(parseSRT(text));
    },
    [setCues]
  );

  // Export SRT file
  const exportSRT = useCallback(() => {
    const content = formatSRT([...cues]);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video?.filename?.replace(/\.[^.]+$/, '') || 'subtitles'}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [cues, video]);

  // Export .sbp project file
  const exportSBP = useCallback(() => {
    if (!video) return;
    const serializer = getProjectSerializer();
    const project = serializer.createProject({
      name: video.filename ?? 'project',
      video: {
        id: video.id,
        filename: video.filename,
        duration: video.duration,
        width: video.width,
        height: video.height,
        mimeType: video.mimeType,
        fileSize: video.fileSize,
      },
      cues: [...cues],
      style,
      generatedBy: 'ui',
    });
    const blob = serializer.toBlob(project);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video.filename?.replace(/\.[^.]+$/, '') || 'project'}.sbp`;
    a.click();
    URL.revokeObjectURL(url);
  }, [video, cues, style, getProjectSerializer]);

  // Import .sbp project file
  const importSBP = useCallback(
    async (file: File) => {
      const serializer = getProjectSerializer();
      const project = await serializer.fromFile(file);
      setCues(project.cues);
      setStyle(project.style);
    },
    [getProjectSerializer, setCues, setStyle]
  );

  // New project
  const newProject = useCallback(() => {
    reset();
    useTimelineStore.getState().reset();
    useEngineStore.getState().resetRender();
  }, [reset]);

  return {
    // State
    isDirty,
    video,

    // Project management
    loadProject,
    newProject,

    // Import/Export
    importSRT,
    exportSRT,
    importSBP,
    exportSBP,
  };
}
