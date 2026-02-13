'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store/editor-store';

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const videoUrl = useEditorStore((s) => s.videoUrl);
  const cues = useEditorStore((s) => s.cues);
  const style = useEditorStore((s) => s.style);
  const currentTime = useEditorStore((s) => s.currentTime);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setDuration = useEditorStore((s) => s.setDuration);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);

  // Sync playback state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // Time update handler
  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  }, [setCurrentTime]);

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  }, [setDuration]);

  // Seek to time when currentTime changes externally (e.g. from timeline click)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (Math.abs(video.currentTime - currentTime) > 0.1) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  // Get active cues for current time
  const activeCues = cues.filter(
    (cue) => currentTime >= cue.startTime && currentTime <= cue.endTime
  );

  return (
    <div ref={containerRef} className="relative flex h-full items-center justify-center">
      <video
        ref={videoRef}
        src={videoUrl || undefined}
        className="max-h-full max-w-full"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onClick={() => setIsPlaying(!isPlaying)}
      />

      {/* Subtitle overlay */}
      {activeCues.length > 0 && (
        <div
          className="pointer-events-none absolute left-0 right-0 flex justify-center px-4"
          style={{ bottom: `${100 - style.position}%` }}
        >
          <div
            style={{
              fontFamily: style.fontFamily,
              fontSize: `${style.fontSize}px`,
              color: style.fontColor,
              fontWeight: style.fontWeight,
              fontStyle: style.fontStyle,
              backgroundColor: `${style.backgroundColor}${Math.round(style.backgroundOpacity * 255)
                .toString(16)
                .padStart(2, '0')}`,
              textAlign: style.alignment,
              lineHeight: style.lineHeight,
              padding: `${style.padding}px ${style.padding * 2}px`,
              textShadow:
                style.outlineWidth > 0
                  ? `0 0 ${style.outlineWidth}px ${style.outlineColor},
                     0 0 ${style.shadowBlur}px ${style.shadowColor}`
                  : undefined,
              borderRadius: '4px',
              maxWidth: '80%',
              whiteSpace: 'pre-wrap' as const,
            }}
          >
            {activeCues.map((cue) => (
              <div key={cue.id}>{cue.text}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
