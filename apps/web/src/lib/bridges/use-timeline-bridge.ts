'use client';

import { useCallback, useMemo } from 'react';
import { useTimelineStore } from '@/store/timeline-store';
import { useProjectStore } from '@/store/project-store';

/**
 * Bridge between UI and TimelineStore + ProjectStore.
 * Handles timeline interactions: drag, snap, zoom, seek.
 */
export function useTimelineBridge() {
  const cues = useProjectStore((s) => s.cues);
  const selectedCueId = useProjectStore((s) => s.selectedCueId);
  const setSelectedCueId = useProjectStore((s) => s.setSelectedCueId);

  const currentTime = useTimelineStore((s) => s.currentTime);
  const duration = useTimelineStore((s) => s.duration);
  const zoom = useTimelineStore((s) => s.zoom);
  const scrollLeft = useTimelineStore((s) => s.scrollLeft);
  const snapEnabled = useTimelineStore((s) => s.snapEnabled);
  const snapIntervalSeconds = useTimelineStore((s) => s.snapIntervalSeconds);
  const drag = useTimelineStore((s) => s.drag);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const setZoom = useTimelineStore((s) => s.setZoom);
  const setScrollLeft = useTimelineStore((s) => s.setScrollLeft);
  const startDrag = useTimelineStore((s) => s.startDrag);
  const clearDrag = useTimelineStore((s) => s.clearDrag);
  const toggleSnap = useTimelineStore((s) => s.toggleSnap);
  const zoomIn = useTimelineStore((s) => s.zoomIn);
  const zoomOut = useTimelineStore((s) => s.zoomOut);

  const pixelsPerSecond = 50 * zoom;
  const timelineWidth = Math.max(duration * pixelsPerSecond, 800);

  // Snap time to grid if enabled
  const snapTime = useCallback(
    (time: number) => {
      if (!snapEnabled) return time;
      return Math.round(time / snapIntervalSeconds) * snapIntervalSeconds;
    },
    [snapEnabled, snapIntervalSeconds]
  );

  // Click on timeline to seek
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent, containerRef: React.RefObject<HTMLDivElement | null>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scroll = containerRef.current?.scrollLeft ?? 0;
      const x = e.clientX - rect.left + scroll;
      const time = x / pixelsPerSecond;
      setCurrentTime(snapTime(Math.max(0, Math.min(duration, time))));
    },
    [pixelsPerSecond, duration, setCurrentTime, snapTime]
  );

  // Drag handlers for cue blocks on timeline
  const handleBlockMouseDown = useCallback(
    (
      e: React.MouseEvent,
      cueId: string,
      type: 'move' | 'resize-start' | 'resize-end'
    ) => {
      e.stopPropagation();
      const cue = cues.find((c) => c.id === cueId);
      if (!cue) return;

      setSelectedCueId(cueId);
      startDrag({
        cueId,
        type,
        startX: e.clientX,
        origStart: cue.startTime,
        origEnd: cue.endTime,
      });
    },
    [cues, setSelectedCueId, startDrag]
  );

  // Generate time markers
  const markers = useMemo(() => {
    const result: { time: number; label: string }[] = [];
    const interval = zoom >= 2 ? 1 : zoom >= 1 ? 2 : 5;
    for (let t = 0; t <= duration; t += interval) {
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      result.push({ time: t, label: `${m}:${String(s).padStart(2, '0')}` });
    }
    return result;
  }, [zoom, duration]);

  return {
    // State
    cues,
    selectedCueId,
    currentTime,
    duration,
    zoom,
    scrollLeft,
    snapEnabled,
    drag,
    pixelsPerSecond,
    timelineWidth,
    markers,

    // Actions
    setCurrentTime,
    setZoom,
    zoomIn,
    zoomOut,
    setScrollLeft,
    setSelectedCueId,
    toggleSnap,
    snapTime,
    handleTimelineClick,
    handleBlockMouseDown,
    startDrag,
    clearDrag,
  };
}
