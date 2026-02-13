'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useEditorStore } from '@/store/editor-store';

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);

  const cues = useEditorStore((s) => s.cues);
  const duration = useEditorStore((s) => s.duration);
  const currentTime = useEditorStore((s) => s.currentTime);
  const selectedCueId = useEditorStore((s) => s.selectedCueId);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setSelectedCueId = useEditorStore((s) => s.setSelectedCueId);
  const updateCue = useEditorStore((s) => s.updateCue);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);

  const pixelsPerSecond = 50 * zoom;
  const timelineWidth = Math.max(duration * pixelsPerSecond, 800);

  // Click on timeline to seek
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scrollLeft = containerRef.current?.scrollLeft || 0;
      const x = e.clientX - rect.left + scrollLeft;
      const time = x / pixelsPerSecond;
      setCurrentTime(Math.max(0, Math.min(duration, time)));
    },
    [pixelsPerSecond, duration, setCurrentTime]
  );

  // Generate time markers
  const markers: { time: number; label: string }[] = [];
  const interval = zoom >= 2 ? 1 : zoom >= 1 ? 2 : 5;
  for (let t = 0; t <= duration; t += interval) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    markers.push({ time: t, label: `${m}:${String(s).padStart(2, '0')}` });
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const state = useEditorStore.getState();
      switch (e.key) {
        case ' ':
          e.preventDefault();
          useEditorStore.getState().setIsPlaying(!state.isPlaying);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentTime(Math.max(0, state.currentTime - (e.shiftKey ? 1 : 0.1)));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentTime(Math.min(state.duration, state.currentTime + (e.shiftKey ? 1 : 0.1)));
          break;
        case 'Delete':
        case 'Backspace':
          if (state.selectedCueId) {
            e.preventDefault();
            useEditorStore.getState().removeCue(state.selectedCueId);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentTime]);

  // Drag state for subtitle blocks
  const dragRef = useRef<{
    cueId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    origStart: number;
    origEnd: number;
  } | null>(null);

  const handleBlockMouseDown = (
    e: React.MouseEvent,
    cueId: string,
    type: 'move' | 'resize-start' | 'resize-end'
  ) => {
    e.stopPropagation();
    const cue = cues.find((c) => c.id === cueId);
    if (!cue) return;

    setSelectedCueId(cueId);
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
          const newStart = Math.max(0, Math.min(dragRef.current.origEnd - 0.1, dragRef.current.origStart + dt));
          updateCue(dragRef.current.cueId, { startTime: newStart });
          break;
        }
        case 'resize-end': {
          const newEnd = Math.min(duration, Math.max(dragRef.current.origStart + 0.1, dragRef.current.origEnd + dt));
          updateCue(dragRef.current.cueId, { endTime: newEnd });
          break;
        }
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (duration === 0) return null;

  return (
    <div className="border-t">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 border-b px-3 py-1">
        <span className="text-xs text-muted-foreground">Zoom:</span>
        <button
          className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
          onClick={() => setZoom(Math.max(0.25, zoom / 2))}
        >
          -
        </button>
        <span className="text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
          onClick={() => setZoom(Math.min(8, zoom * 2))}
        >
          +
        </button>
      </div>

      {/* Timeline area */}
      <div
        ref={containerRef}
        className="relative h-32 overflow-x-auto overflow-y-hidden"
        onClick={handleTimelineClick}
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
                    onMouseDown={(e) => handleBlockMouseDown(e, cue.id, 'resize-start')}
                  />

                  {/* Block body - draggable */}
                  <div
                    className="flex-1 cursor-grab truncate px-1 active:cursor-grabbing"
                    onMouseDown={(e) => handleBlockMouseDown(e, cue.id, 'move')}
                  >
                    {cue.text}
                  </div>

                  {/* Right resize handle */}
                  <div
                    className="h-full w-1 shrink-0 cursor-col-resize bg-primary/40 hover:bg-primary"
                    onMouseDown={(e) => handleBlockMouseDown(e, cue.id, 'resize-end')}
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
