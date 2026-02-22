'use client';

import { useEffect } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useTimelineStore } from '@/store/timeline-store';
import { RemoveCueAction } from '@subtitle-burner/core';

/**
 * Bridge for keyboard shortcuts.
 * Dispatches to other bridges/stores based on key combinations.
 */
export function useKeyboardBridge() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip when user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      const timelineState = useTimelineStore.getState();
      const projectState = useProjectStore.getState();

      // Ctrl/Cmd modifier shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              projectState.redo();
            } else {
              projectState.undo();
            }
            return;
          case 'y':
            e.preventDefault();
            projectState.redo();
            return;
        }
        return;
      }

      // Non-modifier shortcuts
      switch (e.key) {
        case ' ':
          e.preventDefault();
          timelineState.setIsPlaying(!timelineState.isPlaying);
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            // Fine step: 1 second
            timelineState.setCurrentTime(
              Math.max(0, timelineState.currentTime - 1)
            );
          } else {
            // Frame step
            timelineState.setCurrentTime(
              Math.max(0, timelineState.currentTime - 1 / 30)
            );
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            timelineState.setCurrentTime(
              Math.min(timelineState.duration, timelineState.currentTime + 1)
            );
          } else {
            timelineState.setCurrentTime(
              Math.min(timelineState.duration, timelineState.currentTime + 1 / 30)
            );
          }
          break;

        case 'Delete':
        case 'Backspace':
          if (projectState.selectedCueId) {
            e.preventDefault();
            projectState.executeAction(
              new RemoveCueAction(projectState.selectedCueId)
            );
            projectState.setSelectedCueId(null);
          }
          break;

        case 'Escape':
          projectState.setSelectedCueId(null);
          break;

        case 'j':
          // Step backward 5s
          timelineState.setCurrentTime(
            Math.max(0, timelineState.currentTime - 5)
          );
          break;

        case 'k':
          // Toggle play/pause
          timelineState.setIsPlaying(!timelineState.isPlaying);
          break;

        case 'l':
          // Step forward 5s
          timelineState.setCurrentTime(
            Math.min(timelineState.duration, timelineState.currentTime + 5)
          );
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
