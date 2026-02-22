'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useEngineStore } from '@/store/engine-store';
import { renderVideo, type RenderProgress } from '@/lib/ffmpeg/client-renderer';
import type { RenderQuality } from '@subtitle-burner/types';

/**
 * Bridge between UI and RenderEngine + EngineStore.
 * Handles client-side and server-side rendering.
 */
export function useRenderBridge() {
  const video = useProjectStore((s) => s.video);
  const videoFile = useProjectStore((s) => s.videoFile);
  const cues = useProjectStore((s) => s.cues);
  const style = useProjectStore((s) => s.style);
  const videoUrl = useProjectStore((s) => s.videoUrl);

  const renderStatus = useEngineStore((s) => s.renderStatus);
  const renderProgress = useEngineStore((s) => s.renderProgress);
  const renderMessage = useEngineStore((s) => s.renderMessage);
  const renderResultUrl = useEngineStore((s) => s.renderResultUrl);
  const renderPreset = useEngineStore((s) => s.renderPreset);
  const setRenderStatus = useEngineStore((s) => s.setRenderStatus);
  const setRenderJobId = useEngineStore((s) => s.setRenderJobId);
  const setRenderResultUrl = useEngineStore((s) => s.setRenderResultUrl);
  const setRenderPreset = useEngineStore((s) => s.setRenderPreset);
  const resetRender = useEngineStore((s) => s.resetRender);
  const getRenderEngine = useEngineStore((s) => s.getRenderEngine);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const renderClient = useCallback(async () => {
    if (!video) return;

    setRenderStatus('rendering', 0, 'Preparing...');

    try {
      let file = videoFile;
      if (!file) {
        if (!videoUrl) throw new Error('No video available');
        setRenderStatus('rendering', 0, 'Downloading video...');
        const res = await fetch(videoUrl);
        if (!res.ok) throw new Error('Failed to download video');
        const blob = await res.blob();
        file = new File([blob], video.filename || 'video.mp4', {
          type: video.mimeType || 'video/mp4',
        });
      }

      const handleProgress = (p: RenderProgress) => {
        setRenderStatus('rendering', p.progress, p.message);
      };

      const blob = await renderVideo(
        file,
        [...cues],
        style,
        video.width,
        video.height,
        handleProgress
      );

      const url = URL.createObjectURL(blob);
      setRenderResultUrl(url);
      setRenderStatus('done', 100, 'Render complete!');
    } catch (err) {
      setRenderStatus(
        'error',
        0,
        err instanceof Error ? err.message : 'Render failed'
      );
    }
  }, [video, videoFile, videoUrl, cues, style, setRenderStatus, setRenderResultUrl]);

  const renderServer = useCallback(async () => {
    if (!video?.id) return;

    setRenderStatus('rendering', 0, 'Creating render job...');

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create render job');
      }

      const job = await res.json();
      setRenderJobId(job.id);

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/render/${job.id}`);
          if (!statusRes.ok) return;

          const status = await statusRes.json();

          if (status.status === 'COMPLETED') {
            if (pollRef.current) clearInterval(pollRef.current);
            setRenderStatus('done', 100, 'Complete!');

            const dlRes = await fetch(`/api/render/${job.id}/download`);
            if (dlRes.redirected) {
              setRenderResultUrl(dlRes.url);
            } else if (dlRes.ok) {
              const { url } = await dlRes.json();
              setRenderResultUrl(url);
            }
          } else if (status.status === 'FAILED') {
            if (pollRef.current) clearInterval(pollRef.current);
            setRenderStatus('error', 0, status.error || 'Failed');
          } else {
            setRenderStatus(
              'rendering',
              status.progress ?? 0,
              status.status === 'QUEUED'
                ? 'Waiting in queue...'
                : `Rendering... ${status.progress ?? 0}%`
            );
          }
        } catch {
          // ignore polling errors
        }
      }, 2000);
    } catch (err) {
      setRenderStatus(
        'error',
        0,
        err instanceof Error ? err.message : 'Failed to start render'
      );
    }
  }, [video, setRenderStatus, setRenderJobId, setRenderResultUrl]);

  const downloadResult = useCallback(() => {
    if (!renderResultUrl) return;
    const a = document.createElement('a');
    a.href = renderResultUrl;
    a.download = `${video?.filename?.replace(/\.[^.]+$/, '') || 'video'}_subtitled.mp4`;
    a.click();
  }, [renderResultUrl, video]);

  const estimateTime = useCallback(
    (preset?: RenderQuality) => {
      if (!video) return 0;
      const engine = getRenderEngine();
      return engine.estimateRenderTime(
        video.duration ?? 0,
        { width: video.width, height: video.height },
        preset ?? renderPreset
      );
    },
    [video, renderPreset, getRenderEngine]
  );

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (renderResultUrl && renderResultUrl.startsWith('blob:')) {
      URL.revokeObjectURL(renderResultUrl);
    }
    resetRender();
  }, [renderResultUrl, resetRender]);

  const isRendering = renderStatus === 'rendering' || renderStatus === 'uploading';

  return {
    // State
    renderStatus,
    renderProgress,
    renderMessage,
    renderResultUrl,
    renderPreset,
    isRendering,
    canRender: cues.length > 0 && !!video,

    // Actions
    renderClient,
    renderServer,
    downloadResult,
    setRenderPreset,
    estimateTime,
    cleanup,
  };
}
