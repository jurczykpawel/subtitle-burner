'use client';

import { useRef, useCallback } from 'react';
import { useTimelineBridge } from '@/lib/bridges/use-timeline-bridge';
import { useSubtitleBridge } from '@/lib/bridges/use-subtitle-bridge';
import { useKeyboardBridge } from '@/lib/bridges/use-keyboard-bridge';
import { useUIStore } from '@/store/ui-store';

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);

  const timelineHeight = useUIStore((s) => s.timelineHeight);
  const setTimelineHeight = useUIStore((s) => s.setTimelineHeight);

  const {
    cues,
    selectedCueId,
    currentTime,
    duration,
    zoom,
    snapEnabled,
    pixelsPerSecond,
    timelineWidth,
    markers,
    handleTimelineClick,
    handleBlockMouseDown,
    zoomIn,
    zoomOut,
    toggleSnap,
    clearDrag,
  } = useTimelineBridge();

  const { updateCue } = useSubtitleBridge();

  // Register keyboard shortcuts
  useKeyboardBridge();

  // Resize handle for timeline height
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizingRef.current = true;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';

      const startY = e.clientY;
      const startHeight = timelineHeight;

      const onMouseMove = (ev: MouseEvent) => {
        if (!resizingRef.current) return;
        const dy = startY - ev.clientY;
        setTimelineHeight(startHeight + dy);
      };

      const onMouseUp = () => {
        resizingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [timelineHeight, setTimelineHeight]
  );

  // Drag handling for subtitle blocks
  const dragRef = useRef<{
    cueId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    origStart: number;
    origEnd: number;
  } | null>(null);

  const onBlockMouseDown = useCallback(
    (
      e: React.MouseEvent,
      cueId: string,
      type: 'move' | 'resize-start' | 'resize-end'
    ) => {
      handleBlockMouseDown(e, cueId, type);

      const cue = cues.find((c) => c.id === cueId);
      if (!cue) return;

      dragRef.current = {
        cueId,
        type,
        startX: e.clientX,
        origStart: cue.startTime,
        origEnd: cue.endTime,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dt = dx / pixelsPerSecond;

        switch (dragRef.current.type) {
          case 'move': {
            const newStart = Math.max(0, dragRef.current.origStart + dt);
            const dur = dragRef.current.origEnd - dragRef.current.origStart;
            const clampedStart = Math.min(newStart, duration - dur);
            updateCue(dragRef.current.cueId, {
              startTime: clampedStart,
              endTime: clampedStart + dur,
            });
            break;
          }
          case 'resize-start': {
            const newStart = Math.max(
              0,
              Math.min(dragRef.current.origEnd - 0.1, dragRef.current.origStart + dt)
            );
            updateCue(dragRef.current.cueId, { startTime: newStart });
            break;
          }
          case 'resize-end': {
            const newEnd = Math.min(
              duration,
              Math.max(dragRef.current.origStart + 0.1, dragRef.current.origEnd + dt)
            );
            updateCue(dragRef.current.cueId, { endTime: newEnd });
            break;
          }
        }
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        clearDrag();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [cues, pixelsPerSecond, duration, handleBlockMouseDown, updateCue, clearDrag]
  );

  if (duration === 0) return null;

  return (
    <div className="border-t" style={{ height: timelineHeight }}>
      {/* Resize handle */}
      <div
        className="group flex h-1.5 cursor-row-resize items-center justify-center hover:bg-primary/20"
        onMouseDown={handleResizeStart}
      >
        <div className="h-px w-8 rounded bg-muted-foreground/30 group-hover:bg-primary" />
      </div>

      {/* Zoom + snap controls */}
      <div className="flex items-center gap-2 border-b px-3 py-1">
        <span className="text-xs text-muted-foreground">Zoom:</span>
        <button
          className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
          onClick={zoomOut}
        >
          -
        </button>
        <span className="text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
          onClick={zoomIn}
        >
          +
        </button>

        <div className="mx-2 h-4 w-px bg-border" />

        <button
          className={`rounded border px-2 py-0.5 text-xs ${
            snapEnabled
              ? 'border-primary bg-primary/10 text-primary'
              : 'hover:bg-muted'
          }`}
          onClick={toggleSnap}
        >
          Snap
        </button>
      </div>

      {/* Timeline area */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto overflow-y-hidden"
        style={{ height: 'calc(100% - 30px)' }}
        onClick={(e) => handleTimelineClick(e, containerRef)}
      >
        <div className="relative" style={{ width: timelineWidth, height: '100%' }}>
          {/* Time markers */}
          <div className="absolute left-0 top-0 h-6 w-full">
            {markers.map((marker) => (
              <div
                key={marker.time}
                className="absolute top-0 border-l border-muted-foreground/20"
                style={{ left: marker.time * pixelsPerSecond, height: '100%' }}
              >
                <span className="ml-1 text-[10px] text-muted-foreground">{marker.label}</span>
              </div>
            ))}
          </div>

          {/* Subtitle blocks */}
          <div className="absolute left-0 top-6 w-full" style={{ height: 'calc(100% - 24px)' }}>
            {cues.map((cue) => {
              const left = cue.startTime * pixelsPerSecond;
              const width = (cue.endTime - cue.startTime) * pixelsPerSecond;

              return (
                <div
                  key={cue.id}
                  className={`absolute top-2 flex h-10 items-center overflow-hidden rounded border text-xs ${
                    selectedCueId === cue.id
                      ? 'border-primary bg-primary/20'
                      : 'border-primary/40 bg-primary/10'
                  }`}
                  style={{ left, width: Math.max(width, 4) }}
                >
                  {/* Left resize handle */}
                  <div
                    className="h-full w-1 shrink-0 cursor-col-resize bg-primary/40 hover:bg-primary"
                    onMouseDown={(e) => onBlockMouseDown(e, cue.id, 'resize-start')}
                  />

                  {/* Block body - draggable */}
                  <div
                    className="flex-1 cursor-grab truncate px-1 active:cursor-grabbing"
                    onMouseDown={(e) => onBlockMouseDown(e, cue.id, 'move')}
                  >
                    {cue.text}
                  </div>

                  {/* Right resize handle */}
                  <div
                    className="h-full w-1 shrink-0 cursor-col-resize bg-primary/40 hover:bg-primary"
                    onMouseDown={(e) => onBlockMouseDown(e, cue.id, 'resize-end')}
                  />
                </div>
              );
            })}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 z-10 w-px bg-red-500"
            style={{ left: currentTime * pixelsPerSecond, height: '100%' }}
          >
            <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-red-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
