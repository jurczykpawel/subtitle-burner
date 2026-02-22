'use client';

import { useCallback, useMemo } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useTimelineStore } from '@/store/timeline-store';
import { useEngineStore } from '@/store/engine-store';
import {
  AddCueAction,
  RemoveCueAction,
  UpdateCueAction,
  SplitCueAction,
  MergeCuesAction,
} from '@subtitle-burner/core';
import type { SubtitleCue } from '@subtitle-burner/types';

/**
 * Bridge between UI and SubtitleEngine + ActionSystem + ProjectStore.
 * All cue mutations go through the action system for undo/redo support.
 */
export function useSubtitleBridge() {
  const cues = useProjectStore((s) => s.cues);
  const selectedCueId = useProjectStore((s) => s.selectedCueId);
  const executeAction = useProjectStore((s) => s.executeAction);
  const setSelectedCueId = useProjectStore((s) => s.setSelectedCueId);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const duration = useTimelineStore((s) => s.duration);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const getSubtitleEngine = useEngineStore((s) => s.getSubtitleEngine);

  const addCue = useCallback(
    (text = 'New subtitle') => {
      const endTime = Math.min(currentTime + 3, duration || currentTime + 3);
      const action = new AddCueAction({ startTime: currentTime, endTime, text });
      executeAction(action);
    },
    [currentTime, duration, executeAction]
  );

  const removeCue = useCallback(
    (id: string) => {
      executeAction(new RemoveCueAction(id));
      if (selectedCueId === id) setSelectedCueId(null);
    },
    [selectedCueId, executeAction, setSelectedCueId]
  );

  const updateCue = useCallback(
    (id: string, updates: Partial<Omit<SubtitleCue, 'id'>>) => {
      executeAction(new UpdateCueAction(id, updates));
    },
    [executeAction]
  );

  const splitCue = useCallback(
    (id: string) => {
      const cue = cues.find((c) => c.id === id);
      if (!cue) return;
      const midpoint = (cue.startTime + cue.endTime) / 2;
      executeAction(new SplitCueAction(id, midpoint));
    },
    [cues, executeAction]
  );

  const mergeCues = useCallback(
    (id1: string, id2: string) => {
      executeAction(new MergeCuesAction([id1, id2]));
    },
    [executeAction]
  );

  const selectCue = useCallback(
    (id: string | null) => {
      setSelectedCueId(id);
      if (id) {
        const cue = cues.find((c) => c.id === id);
        if (cue) setCurrentTime(cue.startTime);
      }
    },
    [cues, setSelectedCueId, setCurrentTime]
  );

  const getCuesAtTime = useCallback(
    (time: number) => {
      const engine = getSubtitleEngine();
      return engine.getCueAtTime(cues, time);
    },
    [cues, getSubtitleEngine]
  );

  const activeCues = useMemo(
    () => getCuesAtTime(currentTime),
    [getCuesAtTime, currentTime]
  );

  const sortedCues = useMemo(
    () => [...cues].sort((a, b) => a.startTime - b.startTime),
    [cues]
  );

  return {
    cues,
    sortedCues,
    activeCues,
    selectedCueId,
    addCue,
    removeCue,
    updateCue,
    splitCue,
    mergeCues,
    selectCue,
    getCuesAtTime,
  };
}
