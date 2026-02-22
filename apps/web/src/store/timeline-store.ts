import { create } from 'zustand';

// ============================================================
// Timeline Store - playback, zoom, drag, snap
// ============================================================

interface DragState {
  readonly cueId: string;
  readonly type: 'move' | 'resize-start' | 'resize-end';
  readonly startX: number;
  readonly origStart: number;
  readonly origEnd: number;
}

interface TimelineStoreState {
  // Playback
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;

  // Timeline display
  zoom: number;
  scrollLeft: number;

  // Interaction
  drag: DragState | null;
  snapEnabled: boolean;
  snapIntervalSeconds: number;
}

interface TimelineStoreActions {
  // Playback
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackRate: (rate: number) => void;

  // Timeline display
  setZoom: (zoom: number) => void;
  setScrollLeft: (scrollLeft: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;

  // Interaction
  startDrag: (drag: DragState) => void;
  clearDrag: () => void;
  toggleSnap: () => void;

  // Reset
  reset: () => void;
}

export type TimelineStore = TimelineStoreState & TimelineStoreActions;

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  // Playback
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackRate: 1,

  // Timeline display
  zoom: 1,
  scrollLeft: 0,

  // Interaction
  drag: null,
  snapEnabled: true,
  snapIntervalSeconds: 0.5,

  // Playback actions
  setCurrentTime: (time) => {
    const { duration } = get();
    set({ currentTime: Math.max(0, Math.min(duration, time)) });
  },

  setDuration: (duration) => {
    const d = Math.max(0, duration);
    const { currentTime } = get();
    set({
      duration: d,
      currentTime: Math.min(currentTime, d),
    });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setPlaybackRate: (rate) => {
    set({ playbackRate: Math.max(0.25, Math.min(4, rate)) });
  },

  // Timeline display actions
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(8, zoom)) }),
  setScrollLeft: (scrollLeft) => set({ scrollLeft }),

  zoomIn: () => {
    const { zoom } = get();
    set({ zoom: Math.min(8, zoom * 2) });
  },

  zoomOut: () => {
    const { zoom } = get();
    set({ zoom: Math.max(0.25, zoom / 2) });
  },

  // Interaction actions
  startDrag: (drag) => set({ drag }),
  clearDrag: () => set({ drag: null }),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  // Reset
  reset: () =>
    set({
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      playbackRate: 1,
      zoom: 1,
      scrollLeft: 0,
      drag: null,
      snapEnabled: true,
      snapIntervalSeconds: 0.5,
    }),
}));
