'use client';

import { useRef, useMemo } from 'react';
import { usePlaybackBridge } from '@/lib/bridges/use-playback-bridge';
import { useSubtitleBridge } from '@/lib/bridges/use-subtitle-bridge';
import { useProjectStore } from '@/store/project-store';
import { useTimelineStore } from '@/store/timeline-store';
import { renderAnimatedCaption } from '@subtitle-burner/core';
import type { WordSegment } from '@subtitle-burner/core';

function SubtitleSegment({ segment }: { segment: WordSegment }) {
  const isGradient = segment.color?.includes('gradient');

  const baseStyle: React.CSSProperties = {
    display: 'inline-block',
    opacity: segment.opacity,
    transform: `scale(${segment.scale}) translateY(${segment.offsetY}px)`,
    transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
  };

  if (isGradient) {
    return (
      <span
        style={{
          ...baseStyle,
          background: segment.color,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {segment.text}{' '}
      </span>
    );
  }

  return (
    <span
      style={{
        ...baseStyle,
        ...(segment.color ? { color: segment.color } : {}),
      }}
    >
      {segment.text}{' '}
    </span>
  );
}

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoUrl = useProjectStore((s) => s.videoUrl);
  const style = useProjectStore((s) => s.style);
  const currentTime = useTimelineStore((s) => s.currentTime);

  const { videoProps } = usePlaybackBridge(videoRef);
  const { activeCues } = useSubtitleBridge();

  const frames = useMemo(
    () =>
      activeCues.map((cue) =>
        renderAnimatedCaption(cue, currentTime, {
          highlightColor: style.highlightColor,
          upcomingColor: style.upcomingColor,
        })
      ),
    [activeCues, currentTime, style.highlightColor, style.upcomingColor]
  );

  return (
    <div className="relative flex h-full items-center justify-center">
      <video
        ref={videoRef}
        src={videoUrl || undefined}
        className="max-h-full max-w-full"
        {...videoProps}
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
            {activeCues.map((cue, cueIdx) => {
              const frame = frames[cueIdx];
              if (!frame?.visible) return null;

              // If frame has multiple segments (animated), render per-word
              if (frame.segments.length > 1 || (frame.segments.length === 1 && frame.segments[0].style !== 'normal')) {
                return (
                  <div key={cue.id}>
                    {frame.segments.map((seg, i) => (
                      <SubtitleSegment key={i} segment={seg} />
                    ))}
                  </div>
                );
              }

              // Simple static rendering
              return <div key={cue.id}>{cue.text}</div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
