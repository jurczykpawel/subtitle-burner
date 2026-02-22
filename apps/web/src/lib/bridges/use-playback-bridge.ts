'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTimelineStore } from '@/store/timeline-store';
import { useEngineStore } from '@/store/engine-store';

/**
 * Bridge between UI and PlaybackController + TimelineStore + <video> element.
 * Synchronizes video element with store state.
 */
export function usePlaybackBridge(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const currentTime = useTimelineStore((s) => s.currentTime);
  const duration = useTimelineStore((s) => s.duration);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const playbackRate = useTimelineStore((s) => s.playbackRate);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const setDuration = useTimelineStore((s) => s.setDuration);
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying);
  const getPlaybackController = useEngineStore((s) => s.getPlaybackController);

  // Track whether we're seeking (to avoid feedback loop)
  const isSeeking = useRef(false);

  // Sync play/pause from store to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, videoRef, setIsPlaying]);

  // Sync playback rate
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = playbackRate;
  }, [playbackRate, videoRef]);

  // Seek video when currentTime changes externally
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isSeeking.current) return;
    if (Math.abs(video.currentTime - currentTime) > 0.1) {
      video.currentTime = currentTime;
    }
  }, [currentTime, videoRef]);

  // Video element event handlers
  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video && !isSeeking.current) {
      setCurrentTime(video.currentTime);
    }
  }, [videoRef, setCurrentTime]);

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) setDuration(video.duration);
  }, [videoRef, setDuration]);

  const onPlay = useCallback(() => setIsPlaying(true), [setIsPlaying]);
  const onPause = useCallback(() => setIsPlaying(false), [setIsPlaying]);
  const onEnded = useCallback(() => setIsPlaying(false), [setIsPlaying]);

  const onVideoClick = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  // Playback controller methods
  const togglePlay = useCallback(() => {
    const controller = getPlaybackController();
    const state = controller.togglePlay({
      currentTime,
      duration,
      isPlaying,
      playbackRate,
    });
    setIsPlaying(state.isPlaying);
    setCurrentTime(state.currentTime);
  }, [currentTime, duration, isPlaying, playbackRate, getPlaybackController, setIsPlaying, setCurrentTime]);

  const seek = useCallback(
    (time: number) => {
      isSeeking.current = true;
      setCurrentTime(time);
      const video = videoRef.current;
      if (video) video.currentTime = time;
      // Reset seeking flag after a tick
      requestAnimationFrame(() => {
        isSeeking.current = false;
      });
    },
    [setCurrentTime, videoRef]
  );

  const stepForward = useCallback(
    (seconds = 5) => {
      const controller = getPlaybackController();
      const state = controller.stepForward(
        { currentTime, duration, isPlaying, playbackRate },
        seconds
      );
      seek(state.currentTime);
    },
    [currentTime, duration, isPlaying, playbackRate, getPlaybackController, seek]
  );

  const stepBackward = useCallback(
    (seconds = 5) => {
      const controller = getPlaybackController();
      const state = controller.stepBackward(
        { currentTime, duration, isPlaying, playbackRate },
        seconds
      );
      seek(state.currentTime);
    },
    [currentTime, duration, isPlaying, playbackRate, getPlaybackController, seek]
  );

  const frameStep = useCallback(
    (direction: 1 | -1) => {
      const controller = getPlaybackController();
      const state = controller.frameStep(
        { currentTime, duration, isPlaying, playbackRate },
        direction
      );
      seek(state.currentTime);
    },
    [currentTime, duration, isPlaying, playbackRate, getPlaybackController, seek]
  );

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }, []);

  return {
    // State
    currentTime,
    duration,
    isPlaying,
    playbackRate,

    // Video element handlers
    videoProps: {
      onTimeUpdate,
      onLoadedMetadata,
      onPlay,
      onPause,
      onEnded,
      onClick: onVideoClick,
    },

    // Control methods
    togglePlay,
    seek,
    stepForward,
    stepBackward,
    frameStep,
    setPlaybackRate: useTimelineStore.getState().setPlaybackRate,

    // Utils
    formatTime,
  };
}
